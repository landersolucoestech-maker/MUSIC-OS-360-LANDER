import { useState } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Users, Search, Loader2, UserCog, Eye, Pencil } from "lucide-react";
import { UsuarioFormModal } from "@/modules/settings/components/UsuarioFormModal";
import { UsuarioViewModal } from "@/modules/settings/components/UsuarioViewModal";
import { EmptyState } from "@/shared/components/EmptyState";
import { useUsuarios, Usuario } from "@/modules/settings/hooks/useUsuarios";
import { formatPersonName } from "@/shared/lib/format-name";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Usuarios() {
  const { usuarios, isLoading } = useUsuarios();
  const [formModal, setFormModal] = useState<{ open: boolean; mode: "create" | "edit"; usuario?: Usuario }>({ open: false, mode: "create" });
  const [viewModal, setViewModal] = useState<{ open: boolean; usuario?: Usuario }>({ open: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [cargoFilter, setCargoFilter] = useState("all-cargo");
  const [statusFilter, setStatusFilter] = useState("all-status");

  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch = 
      (usuario.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (usuario.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCargo = cargoFilter === "all-cargo" || 
      (cargoFilter === "admin" && usuario.role === "admin") ||
      (cargoFilter === "usuario" && usuario.role !== "admin");
    const matchesStatus = statusFilter === "all-status" || usuario.status === statusFilter;
    return matchesSearch && matchesCargo && matchesStatus;
  });

  const hasActiveFilters = searchTerm !== "" || cargoFilter !== "all-cargo" || statusFilter !== "all-status";

  const handleClearFilters = () => {
    setSearchTerm("");
    setCargoFilter("all-cargo");
    setStatusFilter("all-status");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Usuários"
      description="Gerencie usuários e permissões do sistema"
      actions={
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setFormModal({ open: true, mode: "create" })}
        >
          <Users className="h-3.5 w-3.5" /> Novo Usuário
        </Button>
      }
    >
      <div className="space-y-6">

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email…"
              className="pl-9 h-8 text-sm bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={cargoFilter} onValueChange={setCargoFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos os Cargos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-cargo">Todos os Cargos</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="usuario">Usuário</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-card border-border">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={handleClearFilters}>
              Limpar
            </Button>
          )}
        </div>

        {filteredUsuarios.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum usuário encontrado"
            description={hasActiveFilters 
              ? "Nenhum usuário corresponde aos filtros aplicados." 
              : "Novos usuários aparecem aqui após se cadastrarem no sistema."}
          />
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="pt-0">
              <ListSectionHeader
                title="Usuários"
                count={filteredUsuarios.length}
                description="Todos os usuários cadastrados no sistema"
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo / Função</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.map((usuario) => (
                    <TableRow key={usuario.id} data-testid={`row-usuario-${usuario.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0">
                            {getInitials(usuario.full_name)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{formatPersonName(usuario.full_name, "Usuário")}</p>
                            <p className="text-xs text-muted-foreground">{usuario.email || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {usuario.role === "admin" ? "Administrador" : usuario.cargo || "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{usuario.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(usuario.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${usuario.status === "ativo" ? "bg-success" : "bg-gray-500"} text-foreground`}>
                          {usuario.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            data-testid={`button-ver-usuario-${usuario.id}`}
                            onClick={() => setViewModal({
                              open: true,
                              usuario: {
                                ...usuario,
                                nome: usuario.full_name,
                                iniciais: getInitials(usuario.full_name),
                                telefone: usuario.phone,
                                criadoEm: formatDate(usuario.created_at),
                              } as any,
                            })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            data-testid={`button-editar-usuario-${usuario.id}`}
                            onClick={() => setFormModal({ open: true, mode: "edit", usuario })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <UsuarioViewModal 
        open={viewModal.open} 
        onOpenChange={(open) => setViewModal({ ...viewModal, open })} 
        usuario={viewModal.usuario} 
      />
      <UsuarioFormModal 
        open={formModal.open} 
        onOpenChange={(open) => setFormModal({ ...formModal, open })} 
        usuario={formModal.usuario} 
        mode={formModal.mode} 
      />
    </MainLayout>
  );
}
