import React from "react";
import { useTranslation } from "../context/LanguageContext";

export default function Filters({ activeFilter, setActiveFilter }) {
  const { t } = useTranslation();

  const FILTERS = [
    { key: "all", label: t("filterLabels.allProjects"), icon: "category" },
    { key: "reforestation", label: t("filterLabels.reforestation"), icon: "park" },
    { key: "renewable", label: t("filterLabels.renewableEnergy"), icon: "wb_sunny" },
    { key: "agriculture", label: t("filterLabels.agriculture"), icon: "agriculture" },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-center px-5 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#9db0a5]">
          {t("common.filters")}
        </h2>
      </div>

      <div className="flex overflow-x-auto px-5 gap-3 hide-scrollbar">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              data-filter={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all cursor-pointer
                ${
                  isActive
                    ? "bg-[#13ec6d] text-[#0c1510] font-bold border border-[#13ec6d]"
                    : "bg-white dark:bg-[#1a2b21] text-[#2d4235] dark:text-[#c7d1cc] border border-[#e3e8e5] dark:border-[#2d4235] font-semibold hover:border-[#13ec6d] hover:text-[#13ec6d]"
                }`}
            >
              <span
                className="material-icons-round"
                style={{ fontSize: "1.125rem" }}
              >
                {f.icon}
              </span>
              {f.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
