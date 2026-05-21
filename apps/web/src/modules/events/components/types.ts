export type SchedulerStatus =
  | "confirmado"
  | "negociacao"
  | "cancelado"
  | "realizado"
  | "agendado"
  | "pendente"
  | string;

export type AgendaEvent = {
  id: string;
  title: string;
  artist?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  status: SchedulerStatus;
  cache?: number;
  type?: string;
  allDay?: boolean;
  raw?: unknown;
};

export type SchedulerViewMode =
  | "dia"
  | "semana"
  | "mes"
  | "ano"
  | "lista"
  | "feed";

export type SchedulerOption = {
  value: string;
  label: string;
  dot?: string;
};

export type SchedulerViewOption = {
  value: SchedulerViewMode;
  label: string;
  icon?: React.ReactNode;
};
