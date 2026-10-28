/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EMPLOYEE_DATA_SOURCE?: "mock" | "api";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
