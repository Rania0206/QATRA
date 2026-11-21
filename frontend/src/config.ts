export const PROJECT_NAME = "QATRA"; // single place to rename the project

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS === "true";
