import { createRouter, createWebHistory } from "vue-router";
import Search from "../components/Search.vue";
import Workbench from "../components/Workbench.vue";

const routes = [
  {
    path: "/",
    name: "Search",
    component: Search,
  },
  {
    path: "/:param", // 冒号开头表示动态参数
    name: "Workbench",
    component: Workbench,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
