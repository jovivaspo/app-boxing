export interface DurationNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  "aria-label": string;
}

export type UseDurationNumberInputParams = Pick<
  DurationNumberInputProps,
  "value" | "onChange"
>;

export interface UseDurationNumberInputResult {
  display: string;
  handleInputChange: (raw: string) => void;
}
