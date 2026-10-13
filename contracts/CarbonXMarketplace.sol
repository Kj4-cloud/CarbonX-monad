// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CarbonXMarketplace
 * @notice Decentralized Carbon Credit Issuance and Marketplace on Monad.
 *
 * Architecture & Governance:
 * 1. Agricultural Carbon Projects are registered with metadata (coordinates, methodology, NDVI baseline).
 * 2. IMPORTANT: Satellite NDVI analysis alone does NOT prove carbon removal.
 *    Token issuance strictly requires explicit verification by an authorized verifier or administrator.
 * 3. Each Project represents a unique ERC-1155 Token ID.
 * 4. Farmers/Holders can list credits for sale in native MON with escrow protection.
 * 5. Buyers purchase credits directly using native MON.
 * 6. Credit holders can permanently retire (burn) credits, ensuring tamper-proof offset claims.
 * 7. Payment proceeds use a secure pull-over-push withdrawal pattern against reentrancy.
 */
contract CarbonXMarketplace is ERC1155, ERC1155Holder, Ownable, ReentrancyGuard {

    // ─── Structs ─────────────────────────────────────────────────────────────

    struct Project {
        uint256 id;
        address farmer;
        string metadataURI;          // IPFS or HTTPS URI to project metadata & satellite baseline
        uint256 totalIssuedCredits;  // Total verified metric tonnes CO2e minted
        uint256 totalRetiredCredits; // Total metric tonnes CO2e permanently retired
        bool isRegistered;
    }

    struct Listing {
        uint256 listingId;
        uint256 projectId;
        address seller;
        uint256 amount;              // Quantity of credits available in escrow
        uint256 pricePerCreditInWei; // Price per credit denominated in native MON (wei)
        bool active;
    }

    // ─── State Variables ─────────────────────────────────────────────────────

    uint256 private _nextProjectId = 1;
    uint256 private _nextListingId = 1;

    // Project registry: projectId => Project
    mapping(uint256 => Project) public projects;

    // Authorized verifiers: verifierAddress => isAuthorized
    mapping(address => bool) public isVerifier;

    // Marketplace listings: listingId => Listing
    mapping(uint256 => Listing) public listings;

    // Pull-payment balances: sellerAddress => withdrawable MON (in wei)
    mapping(address => uint256) public pendingProceeds;

    // Track total retired credits per user: user => (projectId => retiredAmount)
    mapping(address => mapping(uint256 => uint256)) public userRetiredCredits;

    // Total retired credits globally across all projects
    uint256 public totalGlobalRetiredCredits;

    // ─── Events ──────────────────────────────────────────────────────────────

    event ProjectRegistered(
        uint256 indexed projectId,
        address indexed farmer,
        string metadataURI
    );

    event VerifierUpdated(
        address indexed verifier,
        bool authorized
    );

    event CreditsIssued(
        uint256 indexed projectId,
        address indexed recipient,
        uint256 amount,
        string verificationEvidenceURI
    );

    event CreditsListed(
        uint256 indexed listingId,
        uint256 indexed projectId,
        address indexed seller,
        uint256 amount,
        uint256 pricePerCreditInWei
    );

    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller
    );

    event CreditsPurchased(
        uint256 indexed listingId,
        uint256 indexed projectId,
        address indexed buyer,
        address seller,
        uint256 amount,
        uint256 totalPaid
    );

    event CreditsRetired(
        uint256 indexed projectId,
        address indexed retiree,
        uint256 amount,
        string reason
    );

    event ProceedsWithdrawn(
        address indexed seller,
        uint256 amount
    );

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyVerifierOrOwner() {
        require(
            isVerifier[msg.sender] || msg.sender == owner(),
            "CarbonX: Caller is not an authorized verifier or owner"
        );
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() ERC1155("") Ownable(msg.sender) {
        // Contract deployer is automatically granted verifier permissions
        isVerifier[msg.sender] = true;
        emit VerifierUpdated(msg.sender, true);
    }

    // ─── Project Management ──────────────────────────────────────────────────

    /**
     * @notice Register an agricultural carbon project with metadata.
     * @param metadataURI IPFS/HTTPS URI pointing to project details, GPS coordinates & baseline.
     * @return projectId The assigned project / token ID.
     */
    function registerProject(string calldata metadataURI) external returns (uint256) {
        require(bytes(metadataURI).length > 0, "CarbonX: metadataURI cannot be empty");

        uint256 projectId = _nextProjectId++;
        projects[projectId] = Project({
            id: projectId,
            farmer: msg.sender,
            metadataURI: metadataURI,
            totalIssuedCredits: 0,
            totalRetiredCredits: 0,
            isRegistered: true
        });

        emit ProjectRegistered(projectId, msg.sender, metadataURI);
        return projectId;
    }

    /**
     * @notice Authorize or revoke a carbon-project verification entity.
     * @param verifier Address of the verifier.
     * @param status True to authorize, false to revoke.
     */
    function setVerifier(address verifier, bool status) external onlyOwner {
        require(verifier != address(0), "CarbonX: Invalid verifier address");
        isVerifier[verifier] = status;
        emit VerifierUpdated(verifier, status);
    }

    /**
     * @notice Issue verified carbon credits for a registered project.
     * @dev Restricted to authorized verifiers or owner.
     *      Satellite NDVI analysis serves as auxiliary data; this explicit function confirms issuance.
     * @param projectId The ID of the project for which credits are issued.
     * @param recipient Address receiving the newly minted credit tokens (usually the farmer).
     * @param amount Quantity of metric tonnes CO2e to mint (1 token = 1 tonne CO2e).
     * @param verificationEvidenceURI Evidence URI linking to auditor sign-off and verification proof.
     */
    function issueCredits(
        uint256 projectId,
        address recipient,
        uint256 amount,
        string calldata verificationEvidenceURI
    ) external onlyVerifierOrOwner nonReentrant {
        require(projects[projectId].isRegistered, "CarbonX: Project not registered");
        require(recipient != address(0), "CarbonX: Recipient is zero address");
        require(amount > 0, "CarbonX: Amount must be greater than zero");

        projects[projectId].totalIssuedCredits += amount;
        _mint(recipient, projectId, amount, "");

        emit CreditsIssued(projectId, recipient, amount, verificationEvidenceURI);
    }

    // ─── Marketplace Functions ───────────────────────────────────────────────

    /**
     * @notice List carbon credits for sale on the marketplace.
     * @dev Credits are transferred into escrow in this contract until purchased or cancelled.
     * @param projectId The project / token ID being listed.
     * @param amount Quantity of credits to list.
     * @param pricePerCreditInWei Price per credit in native MON wei (e.g. 1000000000000000 for 0.001 MON).
     * @return listingId The ID of the created marketplace listing.
     */
    function listCredits(
        uint256 projectId,
        uint256 amount,
        uint256 pricePerCreditInWei
    ) external nonReentrant returns (uint256) {
        require(projects[projectId].isRegistered, "CarbonX: Project does not exist");
        require(amount > 0, "CarbonX: Amount must be greater than zero");
        require(pricePerCreditInWei > 0, "CarbonX: Price must be greater than zero");
        require(balanceOf(msg.sender, projectId) >= amount, "CarbonX: Insufficient token balance");

        // Escrow tokens into the marketplace contract
        _safeTransferFrom(msg.sender, address(this), projectId, amount, "");

        uint256 listingId = _nextListingId++;
        listings[listingId] = Listing({
            listingId: listingId,
            projectId: projectId,
            seller: msg.sender,
            amount: amount,
            pricePerCreditInWei: pricePerCreditInWei,
            active: true
        });

        emit CreditsListed(listingId, projectId, msg.sender, amount, pricePerCreditInWei);
        return listingId;
    }

    /**
     * @notice Cancel an active listing and retrieve escrowed credits.
     * @param listingId The ID of the listing to cancel.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "CarbonX: Listing is not active");
        require(listing.seller == msg.sender, "CarbonX: Only seller can cancel listing");

        uint256 remainingAmount = listing.amount;
        listing.amount = 0;
        listing.active = false;

        _safeTransferFrom(address(this), msg.sender, listing.projectId, remainingAmount, "");

        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @notice Purchase carbon credits from an active listing using native MON.
     * @param listingId The listing ID to purchase from.
     * @param amountToBuy The number of credit units to purchase.
     */
    function buyCredits(
        uint256 listingId,
        uint256 amountToBuy
    ) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "CarbonX: Listing is not active");
        require(amountToBuy > 0, "CarbonX: Must buy at least 1 credit");
        require(listing.amount >= amountToBuy, "CarbonX: Not enough credits available in listing");

        uint256 totalCost = listing.pricePerCreditInWei * amountToBuy;
        require(msg.value >= totalCost, "CarbonX: Insufficient MON sent");

        // Update inventory
        listing.amount -= amountToBuy;
        if (listing.amount == 0) {
            listing.active = false;
        }

        // Credit seller proceeds (pull-payment pattern)
        pendingProceeds[listing.seller] += totalCost;

        // Deliver credits from escrow to buyer
        _safeTransferFrom(address(this), msg.sender, listing.projectId, amountToBuy, "");

        emit CreditsPurchased(
            listingId,
            listing.projectId,
            msg.sender,
            listing.seller,
            amountToBuy,
            totalCost
        );

        // Refund any excess payment
        if (msg.value > totalCost) {
            uint256 refund = msg.value - totalCost;
            (bool refundSuccess, ) = payable(msg.sender).call{value: refund}("");
            require(refundSuccess, "CarbonX: Refund transfer failed");
        }
    }

    /**
     * @notice Withdraw accumulated sales proceeds in native MON.
     * @dev Implements the pull-over-push payment pattern to prevent reentrancy and griefing.
     */
    function withdrawProceeds() external nonReentrant {
        uint256 proceeds = pendingProceeds[msg.sender];
        require(proceeds > 0, "CarbonX: No proceeds available for withdrawal");

        // Zero out balance before transfer (Checks-Effects-Interactions)
        pendingProceeds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "CarbonX: MON withdrawal failed");

        emit ProceedsWithdrawn(msg.sender, proceeds);
    }

    // ─── Carbon Credit Retirement ─────────────────────────────────────────────

    /**
     * @notice Permanently retire (burn) carbon credits to claim an offset.
     * @dev Retired credits are permanently removed from circulation and cannot be re-listed or transferred.
     * @param projectId The project / token ID of credits being retired.
     * @param amount The number of credit units to retire.
     * @param reason The beneficiary or reason for retirement (e.g. "Net Zero Corporate Offset 2026").
     */
    function retireCredits(
        uint256 projectId,
        uint256 amount,
        string calldata reason
    ) external nonReentrant {
        require(projects[projectId].isRegistered, "CarbonX: Project does not exist");
        require(amount > 0, "CarbonX: Must retire at least 1 credit");
        require(balanceOf(msg.sender, projectId) >= amount, "CarbonX: Insufficient credit balance to retire");

        projects[projectId].totalRetiredCredits += amount;
        userRetiredCredits[msg.sender][projectId] += amount;
        totalGlobalRetiredCredits += amount;

        _burn(msg.sender, projectId, amount);

        emit CreditsRetired(projectId, msg.sender, amount, reason);
    }

    // ─── View Helpers ────────────────────────────────────────────────────────

    /**
     * @notice Get metadata URI for a given token ID / project.
     */
    function uri(uint256 projectId) public view override returns (string memory) {
        require(projects[projectId].isRegistered, "CarbonX: Project does not exist");
        return projects[projectId].metadataURI;
    }

    /**
     * @notice Get project summary data.
     */
    function getProject(uint256 projectId) external view returns (
        address farmer,
        string memory metadataURI,
        uint256 totalIssued,
        uint256 totalRetired,
        bool isRegistered
    ) {
        Project storage p = projects[projectId];
        return (p.farmer, p.metadataURI, p.totalIssuedCredits, p.totalRetiredCredits, p.isRegistered);
    }

    /**
     * @notice Check active listing details.
     */
    function getListing(uint256 listingId) external view returns (
        uint256 projectId,
        address seller,
        uint256 amount,
        uint256 pricePerCreditInWei,
        bool active
    ) {
        Listing storage l = listings[listingId];
        return (l.projectId, l.seller, l.amount, l.pricePerCreditInWei, l.active);
    }

    /**
     * @notice Total registered projects count.
     */
    function getProjectCount() external view returns (uint256) {
        return _nextProjectId - 1;
    }

    /**
     * @notice Total listings created count.
     */
    function getListingCount() external view returns (uint256) {
        return _nextListingId - 1;
    }

    // ─── ERC-165 Interface Support ───────────────────────────────────────────

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
