import { redirect } from "next/navigation";

export default function InventoryAddRedirect() {
  redirect("/medicines/add");
}
