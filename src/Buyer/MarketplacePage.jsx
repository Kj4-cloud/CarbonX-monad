import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "../context/LanguageContext";
import Filters from "./Filters";
import ProjectCard from "./ProjectCard";

export default function MarketplacePage({
  favorites,
  onToggleFavorite,
  onAddToCart,
  onInfo,
  searchTerm,
}) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch listed projects from DB
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("farmer_projects")
        .select("*")
        .eq("is_listed", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("MarketplacePage: fetch error", error.message);
      }
      // Only keep projects that have positive available credits
      const activeProjects = (data || []).filter((p) => {
        const remaining =
          parseFloat(p.carbon_credits_generated || 0) -
          parseFloat(p.credits_sold || 0);
        return remaining > 0;
      });
      setProjects(activeProjects);
      setLoading(false);
    };
    fetchProjects();

    // Real-time subscription for live updates
    const channel = supabase
      .channel("marketplace-projects")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "farmer_projects" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const remaining =
              parseFloat(payload.new.carbon_credits_generated || 0) -
              parseFloat(payload.new.credits_sold || 0);
            if (payload.new.is_listed && remaining > 0) {
              setProjects((prev) => [payload.new, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            setProjects((prev) => {
              const remaining =
                parseFloat(payload.new.carbon_credits_generated || 0) -
                parseFloat(payload.new.credits_sold || 0);
              // If unlisted or credits reach 0, immediately remove from buyer marketplace
              if (!payload.new.is_listed || remaining <= 0) {
                return prev.filter((p) => p.id !== payload.new.id);
              }
              // If exists, update. If new listing with remaining credits, add.
              const exists = prev.find((p) => p.id === payload.new.id);
              if (exists) {
                return prev.map((p) =>
                  p.id === payload.new.id ? payload.new : p,
                );
              }
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            setProjects((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = projects.filter((p) => {
    const remaining =
      parseFloat(p.carbon_credits_generated || 0) -
      parseFloat(p.credits_sold || 0);
    if (remaining <= 0) return false;

    const matchFilter = activeFilter === "all" || p.category === activeFilter;
    const term = (searchTerm || "").toLowerCase();
    const matchSearch =
      (p.project_name || "").toLowerCase().includes(term) ||
      (p.location || "").toLowerCase().includes(term) ||
      (p.farmer_name || "").toLowerCase().includes(term);
    return matchFilter && matchSearch;
  });

  return (
    <div className="animate-slide-up">
      <Filters activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

      <main id="projects-container" className="px-5 flex flex-col gap-6">
        {loading ? (
          <div className="text-center py-12">
            <span className="material-icons-round block text-4xl text-[#13ec6d] mb-3 animate-spin">
              progress_activity
            </span>
            <p className="text-[#718b7c]">{t("marketplace.loadingProjects")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#718b7c]">
            <span className="material-icons-round block text-6xl text-[#c7d1cc] dark:text-[#4a6354] mb-3">
              search_off
            </span>
            <p>{t("marketplace.noProjectsFound")}</p>
            <p className="text-xs mt-1 text-[#9db0a5]">
              {projects.length === 0
                ? t("marketplace.noFarmersListed")
                : t("marketplace.tryDifferent")}
            </p>
          </div>
        ) : (
          filtered.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              isFavorite={favorites.includes(project.id)}
              onToggleFavorite={onToggleFavorite}
              onAddToCart={onAddToCart}
              onInfo={onInfo}
            />
          ))
        )}
      </main>
    </div>
  );
}
