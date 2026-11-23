export type PasswordStrengthLevel = "empty" | "weak" | "medium" | "strong";

export interface PasswordRuleChecks {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export interface PasswordEvaluation {
  checks: PasswordRuleChecks;
  passedCount: number;
  isValid: boolean;
  level: PasswordStrengthLevel;
  label: string;
}

export function evaluatePassword(password: string): PasswordEvaluation {
  const checks: PasswordRuleChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9\s]/.test(password),
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  const isValid = passedCount === 5;

  if (password.length === 0) {
    return {
      checks,
      passedCount: 0,
      isValid: false,
      level: "empty",
      label: "",
    };
  }

  if (isValid) {
    return {
      checks,
      passedCount,
      isValid: true,
      level: "strong",
      label: "Segura",
    };
  }

  if (passedCount >= 3 && password.length >= 6) {
    return {
      checks,
      passedCount,
      isValid: false,
      level: "medium",
      label: "Media segura",
    };
  }

  return {
    checks,
    passedCount,
    isValid: false,
    level: "weak",
    label: "Muy insegura",
  };
}
