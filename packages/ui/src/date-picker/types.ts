export interface DatePickerFieldProps {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export interface MonthPickerFieldProps {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}
