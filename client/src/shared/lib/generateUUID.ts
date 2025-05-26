import { v4 as uuidNew } from "uuid";

export function getOrGenerateUUID(): string {
  let uuid = localStorage.getItem("uuid");
  if (!uuid) {
    uuid = uuidNew();
    localStorage.setItem("uuid", uuid);
  }
  return uuid;
}
