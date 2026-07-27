export interface RoundsStepperProps {
  value: number;
  onChange: (value: number) => void;
}

export interface UseRoundsStepperResult {
  increment: () => void;
  decrement: () => void;
  handleInputChange: (raw: string) => void;
}
