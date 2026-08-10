import { redirect } from "next/navigation";

export default function InventoryMedicineRedirect({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit?: string };
}) {
  const qs = searchParams.edit ? `?edit=${searchParams.edit}` : "";
  redirect(`/medicines/${params.id}${qs}`);
}
