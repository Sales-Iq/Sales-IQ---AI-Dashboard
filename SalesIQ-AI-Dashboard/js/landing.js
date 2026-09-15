import { makeChart, hideSkeletonLoader } from "./shared.js";
window.addEventListener("DOMContentLoaded", () => {
  makeChart(
    document.getElementById("landingChart"),
    "line",
    {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "SalesIQ Preview",
          data: [0, 0, 0, 0, 0, 0, 0],
          tension: 0.45,
          fill: true,
        },
      ],
    },
    { plugins: { legend: { display: false } } },
  );
  hideSkeletonLoader();
});
