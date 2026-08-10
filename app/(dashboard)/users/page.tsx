"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, KeyRound, Pencil, Plus, UserX } from "lucide-react";
import { toast } from "sonner";
import type { Role, UserDTO } from "@/types";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations/user";
import {
  useAuditLogs,
  useCreateUser,
  useDeactivateUser,
  useUpdateUser,
  useUsers,
  type AuditLogWithUser,
} from "@/lib/hooks/useUsers";
import { formatDateTime } from "@/lib/utils/format";
import {
  APP_MODULES,
  KNOWN_LOGIN_CREDENTIALS,
  roleDefaultAccess,
  type ModuleAccessMap,
} from "@/lib/permissions/modules";
import { ModuleAccessPicker } from "@/components/users/ModuleAccessPicker";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterPanel } from "@/components/shared/FilterPanel";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

const ROLES: Role[] = ["ADMIN", "MANAGER", "PHARMACIST", "CASHIER"];
const FILTER_ROLES: Array<Role | "CUSTOMER"> = [
  ...ROLES,
  "CUSTOMER",
];

const emptyDefaults: CreateUserInput = {
  name: "",
  email: "",
  password: "",
  role: "CASHIER",
  avatar: "",
  isActive: true,
  moduleAccess: roleDefaultAccess("CASHIER"),
};

function roleBadgeVariant(role: Role) {
  switch (role) {
    case "ADMIN":
      return "destructive" as const;
    case "MANAGER":
      return "default" as const;
    case "PHARMACIST":
      return "secondary" as const;
    case "CUSTOMER":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function loginPortal(role: Role) {
  return role === "CUSTOMER" ? "/order/login" : "/login";
}

function knownPassword(email: string) {
  return KNOWN_LOGIN_CREDENTIALS.find(
    (c) => c.email.toLowerCase() === email.toLowerCase()
  );
}

function accessSummary(user: UserDTO) {
  if (user.role === "ADMIN") return "All modules (edit)";
  if (user.role === "CUSTOMER") return "Shop only";
  const map =
    user.moduleAccess && Object.keys(user.moduleAccess).length > 0
      ? user.moduleAccess
      : roleDefaultAccess(user.role);
  const view = APP_MODULES.filter((m) => map[m.key] === "view").length;
  const edit = APP_MODULES.filter((m) => map[m.key] === "edit").length;
  if (view + edit === 0) return "No modules";
  return `${edit} edit · ${view} view`;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mainTab, setMainTab] = React.useState("users");
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserDTO | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    React.useState<UserDTO | null>(null);
  const [moduleAccess, setModuleAccess] = React.useState<ModuleAccessMap>(
    roleDefaultAccess("CASHIER")
  );

  const [auditUserId, setAuditUserId] = React.useState<string>("all");
  const [auditAction, setAuditAction] = React.useState("");
  const [auditEntity, setAuditEntity] = React.useState("");
  const [auditDateFrom, setAuditDateFrom] = React.useState("");
  const [auditDateTo, setAuditDateTo] = React.useState("");
  const [auditPage, setAuditPage] = React.useState(1);

  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  const { data, isLoading } = useUsers({
    search,
    limit: 100,
    role: roleFilter === "all" ? undefined : (roleFilter as Role),
  });

  const { data: auditData, isLoading: auditLoading } = useAuditLogs(
    {
      userId: auditUserId === "all" ? undefined : auditUserId,
      action: auditAction || undefined,
      entity: auditEntity || undefined,
      dateFrom: auditDateFrom || undefined,
      dateTo: auditDateTo || undefined,
      page: auditPage,
      limit: 20,
    },
    { enabled: mainTab === "audit" }
  );

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: emptyDefaults,
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "CASHIER",
      avatar: "",
      isActive: true,
      password: undefined,
      moduleAccess: undefined,
    },
  });

  const watchedCreateRole = createForm.watch("role");
  const watchedEditRole = editForm.watch("role");

  const openCreate = () => {
    setEditing(null);
    createForm.reset(emptyDefaults);
    setModuleAccess(roleDefaultAccess("CASHIER"));
    setDialogOpen(true);
  };

  const openEdit = (user: UserDTO) => {
    setEditing(user);
    const access =
      user.role === "ADMIN"
        ? roleDefaultAccess("ADMIN")
        : user.moduleAccess && Object.keys(user.moduleAccess).length > 0
          ? ({ ...roleDefaultAccess(user.role), ...user.moduleAccess } as ModuleAccessMap)
          : roleDefaultAccess(user.role);
    setModuleAccess(access);
    editForm.reset({
      name: user.name,
      email: user.email,
      role: user.role === "CUSTOMER" ? undefined : user.role,
      avatar: user.avatar ?? "",
      isActive: user.isActive,
      password: undefined,
      moduleAccess: access,
    });
    setDialogOpen(true);
  };

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        ...values,
        avatar: values.avatar || null,
        moduleAccess:
          values.role === "ADMIN" ? null : (moduleAccess as CreateUserInput["moduleAccess"]),
      });
      toast.success("User created");
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const payload: UpdateUserInput = {
        name: values.name,
        email: values.email,
        avatar: values.avatar || null,
        isActive: values.isActive,
      };
      if (editing.role !== "CUSTOMER" && values.role) {
        payload.role = values.role;
      }
      if (values.password && values.password.length >= 8) {
        payload.password = values.password;
      }
      if (editing.role !== "CUSTOMER") {
        payload.moduleAccess =
          (values.role ?? editing.role) === "ADMIN"
            ? null
            : (moduleAccess as UpdateUserInput["moduleAccess"]);
      }
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
      toast.success("User updated");
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user"
      );
    }
  });

  const userColumns = React.useMemo<ColumnDef<UserDTO>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={roleBadgeVariant(row.original.role)}>
            {row.original.role}
          </Badge>
        ),
      },
      {
        id: "login",
        header: "Login",
        cell: ({ row }) => {
          const known = knownPassword(row.original.email);
          return (
            <div className="max-w-[200px] space-y-0.5 text-[11px]">
              <p className="font-medium text-foreground">
                {loginPortal(row.original.role)}
              </p>
              {known ? (
                <p className="font-mono text-muted-foreground">
                  {known.password}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {row.original.role === "CUSTOMER"
                    ? "Customer set password"
                    : "Set / reset in Edit"}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "access",
        header: "Modules",
        cell: ({ row }) => (
          <span className="text-[11px] text-muted-foreground">
            {accessSummary(row.original)}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "secondary" : "outline"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "lastLogin",
        header: "Last login",
        cell: ({ row }) => formatDateTime(row.original.lastLogin),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => openEdit(row.original)}
              aria-label="Edit user"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.isActive && row.original.role !== "CUSTOMER" ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setDeactivateTarget(row.original)}
                aria-label="Deactivate user"
                disabled={row.original.id === session?.user?.id}
              >
                <UserX className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [session?.user?.id]
  );

  const auditColumns = React.useMemo<ColumnDef<AuditLogWithUser>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "When",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: "user",
        header: "User",
        cell: ({ row }) =>
          row.original.user?.name ?? row.original.userId ?? "—",
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.action}</Badge>
        ),
      },
      {
        accessorKey: "entity",
        header: "Entity",
        cell: ({ row }) => (
          <span>
            {row.original.entity}
            {row.original.entityId ? (
              <span className="ml-1 text-xs text-muted-foreground">
                ({row.original.entityId.slice(0, 8)}…)
              </span>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: "IP",
        cell: ({ row }) => row.original.ipAddress ?? "—",
      },
    ],
    []
  );

  if (
    status === "loading" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const isCustomerEdit = editing?.role === "CUSTOMER";
  const effectiveRole = editing
    ? (watchedEditRole as Role | undefined) ?? editing.role
    : (watchedCreateRole as Role);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users & Audit"
        description="Staff logins, module access, and activity."
        actions={
          mainTab === "users" ? (
            <Button type="button" variant="primary" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add user
            </Button>
          ) : null
        }
      />

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#1d9851]" />
          <p className="text-sm font-semibold">Where to login</p>
        </div>
        <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-medium text-foreground">Staff ERP:</span>{" "}
            <code className="rounded bg-muted px-1">/login</code>
          </p>
          <p>
            <span className="font-medium text-foreground">Web customers:</span>{" "}
            <code className="rounded bg-muted px-1">/order/login</code>
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">Email</th>
                <th className="py-1.5 pr-2 font-medium">Password</th>
                <th className="py-1.5 font-medium">Portal</th>
              </tr>
            </thead>
            <tbody>
              {KNOWN_LOGIN_CREDENTIALS.map((c) => (
                <tr key={c.email} className="border-b border-border/60">
                  <td className="py-1.5 pr-2 font-mono text-foreground">
                    {c.email}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-foreground">
                    {c.password}
                  </td>
                  <td className="py-1.5 text-muted-foreground">{c.portal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Customer accounts (test@gmail.com, etc.) use the password they set at
          register. Reset any password from Edit user.
        </p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-2">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by name or email…"
              className="w-full flex-1 sm:max-w-xs"
            />
            <FilterPanel
              values={{ role: roleFilter === "all" ? "" : roleFilter }}
              onChange={(next) => setRoleFilter(next.role || "all")}
              fields={[
                {
                  id: "role",
                  label: "Role",
                  placeholder: "All roles",
                  options: FILTER_ROLES.map((role) => ({
                    label: role,
                    value: role,
                  })),
                },
              ]}
            />
          </div>

          <DataTable
            columns={userColumns}
            data={data?.users ?? []}
            isLoading={isLoading}
            filename="users.csv"
            emptyTitle="No users found"
            emptyDescription="Create a staff account to get started."
            emptyActionLabel="Add user"
            onEmptyAction={openCreate}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPanel
              values={{
                userId: auditUserId === "all" ? "" : auditUserId,
                action: auditAction,
                entity: auditEntity,
                dateFrom: auditDateFrom,
                dateTo: auditDateTo,
              }}
              onChange={(next) => {
                setAuditUserId(next.userId || "all");
                setAuditAction(next.action || "");
                setAuditEntity(next.entity || "");
                setAuditDateFrom(next.dateFrom || "");
                setAuditDateTo(next.dateTo || "");
                setAuditPage(1);
              }}
              fields={[
                {
                  id: "userId",
                  label: "User",
                  placeholder: "All users",
                  options: (data?.users ?? []).map((u) => ({
                    label: u.name,
                    value: u.id,
                  })),
                },
                {
                  id: "action",
                  label: "Action",
                  type: "text",
                  placeholder: "LOGIN, CREATE…",
                },
                {
                  id: "entity",
                  label: "Entity",
                  type: "text",
                  placeholder: "User, Sale…",
                },
                { id: "dateFrom", label: "From", type: "date" },
                { id: "dateTo", label: "To", type: "date" },
              ]}
            />
          </div>

          <DataTable
            columns={auditColumns}
            data={auditData?.logs ?? []}
            isLoading={auditLoading}
            filename="audit-log.csv"
            emptyTitle="No audit events found"
            emptyDescription="Try adjusting your filters."
            showExport
          />

          {auditData?.meta ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {auditData.meta.page} of {auditData.meta.totalPages} (
                {auditData.meta.total} events)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={auditPage >= (auditData.meta.totalPages || 1)}
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle>
          </DialogHeader>

          {editing ? (
            <Form {...editForm}>
              <form onSubmit={onEditSubmit} className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px]">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Eye className="h-3.5 w-3.5" />
                    Signs in at{" "}
                    <code className="rounded bg-background px-1">
                      {loginPortal(editing.role)}
                    </code>
                  </p>
                  {knownPassword(editing.email) ? (
                    <p className="mt-1 font-mono text-muted-foreground">
                      Demo password: {knownPassword(editing.email)!.password}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      Set a new password below to reset login.
                    </p>
                  )}
                </div>

                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isCustomerEdit ? (
                  <FormField
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            setModuleAccess(roleDefaultAccess(v as Role));
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Leave blank to keep current"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                      <FormLabel className="m-0">Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!isCustomerEdit && effectiveRole !== "ADMIN" ? (
                  <ModuleAccessPicker
                    value={moduleAccess}
                    onChange={setModuleAccess}
                  />
                ) : !isCustomerEdit ? (
                  <p className="text-xs text-muted-foreground">
                    ADMIN always has full edit access to every module.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Web customers only access the public shop — no ERP modules.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={updateMutation.isPending}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...createForm}>
              <form onSubmit={onCreateSubmit} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          setModuleAccess(roleDefaultAccess(v as Role));
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedCreateRole !== "ADMIN" ? (
                  <ModuleAccessPicker
                    value={moduleAccess}
                    onChange={setModuleAccess}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    ADMIN always has full edit access to every module.
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createMutation.isPending}
                  >
                    Create user
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title="Deactivate user"
        description={
          deactivateTarget
            ? `Deactivate ${deactivateTarget.name}? They will no longer be able to sign in.`
            : undefined
        }
        confirmLabel="Deactivate"
        variant="destructive"
        loading={deactivateMutation.isPending}
        onConfirm={async () => {
          if (!deactivateTarget) return;
          try {
            await deactivateMutation.mutateAsync(deactivateTarget.id);
            toast.success("User deactivated");
            setDeactivateTarget(null);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to deactivate user"
            );
            throw error;
          }
        }}
      />
    </div>
  );
}
