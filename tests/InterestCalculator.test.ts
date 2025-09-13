import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PRINCIPAL = 101;
const ERR_INVALID_RATE = 102;
const ERR_INVALID_PERIODS = 103;
const ERR_INVALID_FREQUENCY = 104;
const ERR_LOAN_NOT_FOUND = 105;
const ERR_DIVISION_BY_ZERO = 107;
const ERR_LOAN_ALREADY_EXISTS = 114;

interface LoanDetails {
  principal: number;
  rate: number;
  startTime: number;
  frequency: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class InterestCalculatorMock {
  state: {
    admin: string;
    loanDetails: Map<number, LoanDetails>;
    interestRates: Map<number, number>;
    compoundingFrequencies: Map<number, number>;
  } = {
    admin: "ST1ADMIN",
    loanDetails: new Map(),
    interestRates: new Map(),
    compoundingFrequencies: new Map(),
  };
  blockHeight: number = 100;
  caller: string = "ST1ADMIN";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      admin: "ST1ADMIN",
      loanDetails: new Map(),
      interestRates: new Map(),
      compoundingFrequencies: new Map(),
    };
    this.blockHeight = 100;
    this.caller = "ST1ADMIN";
  }

  private powApprox(base: number, exponent: number): number {
    let result = 1;
    for (let i = 0; i < exponent; i++) {
      result *= base;
    }
    return result;
  }

  private mulFixed(a: number, b: number): number {
    return Math.floor((a * b) / 1000000);
  }

  private divFixed(a: number, b: number): number {
    return Math.floor((a * 1000000) / b);
  }

  private addFixed(a: number, b: number): number {
    return a + b;
  }

  private subFixed(a: number, b: number): number {
    return a >= b ? a - b : 0;
  }

  calculateSimpleInterest(principal: number, rate: number, time: number): Result<number> {
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (time <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    return { ok: true, value: this.mulFixed(principal * rate * time, this.divFixed(1, 100)) };
  }

  calculateCompoundInterest(principal: number, rate: number, periods: number, frequency: number): Result<number> {
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (periods <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    if (frequency < 1) return { ok: false, value: ERR_INVALID_FREQUENCY };
    const rateFixed = this.divFixed(rate, 100);
    const onePlusRate = this.addFixed(1, this.divFixed(rateFixed, frequency));
    const compounded = this.powApprox(onePlusRate, periods * frequency);
    return { ok: true, value: this.subFixed(this.mulFixed(principal, compounded), principal) };
  }

  calculateAmortizedPayment(principal: number, rate: number, periods: number): Result<number> {
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (periods <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    const monthlyRate = this.divFixed(rate, 100 * 12);
    const onePlusRate = this.addFixed(1, monthlyRate);
    const powTerm = this.powApprox(onePlusRate, periods);
    const numerator = this.mulFixed(principal, this.mulFixed(monthlyRate, powTerm));
    const denominator = this.subFixed(powTerm, 1);
    if (denominator === 0) return { ok: false, value: ERR_DIVISION_BY_ZERO };
    return { ok: true, value: this.divFixed(numerator, denominator) };
  }

  updateLoanInterest(loanId: number, currentTime: number): Result<number> {
    const loan = this.state.loanDetails.get(loanId);
    if (!loan) return { ok: false, value: ERR_LOAN_NOT_FOUND };
    const timeElapsed = currentTime - loan.startTime;
    if (timeElapsed <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    return this.calculateCompoundInterest(loan.principal, loan.rate, Math.floor(timeElapsed / loan.frequency), loan.frequency);
  }

  getInterestRate(loanId: number): Result<number> {
    const rate = this.state.interestRates.get(loanId);
    if (rate === undefined) return { ok: false, value: ERR_LOAN_NOT_FOUND };
    return { ok: true, value: rate };
  }

  setInterestRate(loanId: number, newRate: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newRate <= 0 || newRate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    this.state.interestRates.set(loanId, newRate);
    return { ok: true, value: true };
  }

  getCompoundingFrequency(loanId: number): Result<number> {
    const freq = this.state.compoundingFrequencies.get(loanId);
    if (freq === undefined) return { ok: false, value: ERR_LOAN_NOT_FOUND };
    return { ok: true, value: freq };
  }

  setCompoundingFrequency(loanId: number, newFrequency: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newFrequency < 1) return { ok: false, value: ERR_INVALID_FREQUENCY };
    this.state.compoundingFrequencies.set(loanId, newFrequency);
    return { ok: true, value: true };
  }

  calculateEffectiveRate(nominalRate: number, frequency: number, periods: number): Result<number> {
    if (nominalRate <= 0 || nominalRate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (frequency < 1) return { ok: false, value: ERR_INVALID_FREQUENCY };
    if (periods <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    const rateFixed = this.divFixed(nominalRate, 100);
    const onePlusRate = this.addFixed(1, this.divFixed(rateFixed, frequency));
    const effective = this.subFixed(this.powApprox(onePlusRate, frequency * periods), 1);
    return { ok: true, value: this.mulFixed(effective, 100) };
  }

  calculateFutureValue(principal: number, rate: number, periods: number, frequency: number): Result<number> {
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (periods <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    if (frequency < 1) return { ok: false, value: ERR_INVALID_FREQUENCY };
    const rateFixed = this.divFixed(rate, 100);
    const onePlusRate = this.addFixed(1, this.divFixed(rateFixed, frequency));
    const fv = this.mulFixed(principal, this.powApprox(onePlusRate, periods * frequency));
    return { ok: true, value: fv };
  }

  calculatePresentValue(futureValue: number, rate: number, periods: number, frequency: number): Result<number> {
    if (futureValue <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (periods <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    if (frequency < 1) return { ok: false, value: ERR_INVALID_FREQUENCY };
    const rateFixed = this.divFixed(rate, 100);
    const onePlusRate = this.addFixed(1, this.divFixed(rateFixed, frequency));
    const discountFactor = this.powApprox(onePlusRate, periods * frequency);
    if (discountFactor === 0) return { ok: false, value: ERR_DIVISION_BY_ZERO };
    return { ok: true, value: this.divFixed(futureValue, discountFactor) };
  }

  calculateAccruedInterestDaily(principal: number, rate: number, days: number): Result<number> {
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (days <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    const dailyRate = this.divFixed(rate, 100 * 365);
    return { ok: true, value: this.mulFixed(principal, this.mulFixed(dailyRate, days)) };
  }

  calculateAccruedInterestMonthly(principal: number, rate: number, months: number): Result<number> {
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (months <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    const monthlyRate = this.divFixed(rate, 100 * 12);
    return { ok: true, value: this.mulFixed(principal, this.mulFixed(monthlyRate, months)) };
  }

  calculateAccruedInterestAnnually(principal: number, rate: number, years: number): Result<number> {
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (years <= 0) return { ok: false, value: ERR_INVALID_PERIODS };
    return { ok: true, value: this.mulFixed(principal, this.mulFixed(this.divFixed(rate, 100), years)) };
  }

  getLoanDetails(loanId: number): Result<LoanDetails> {
    const loan = this.state.loanDetails.get(loanId);
    if (!loan) return { ok: false, value: { principal: 0, rate: 0, startTime: 0, frequency: 0 } };
    return { ok: true, value: loan };
  }

  initializeLoan(loanId: number, principal: number, rate: number, frequency: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (principal <= 0) return { ok: false, value: ERR_INVALID_PRINCIPAL };
    if (rate <= 0 || rate > 2000) return { ok: false, value: ERR_INVALID_RATE };
    if (frequency < 1) return { ok: false, value: ERR_INVALID_FREQUENCY };
    if (this.state.loanDetails.has(loanId)) return { ok: false, value: ERR_LOAN_ALREADY_EXISTS };
    this.state.loanDetails.set(loanId, { principal, rate, startTime: this.blockHeight, frequency });
    return { ok: true, value: true };
  }
}

describe("InterestCalculator", () => {
  let contract: InterestCalculatorMock;

  beforeEach(() => {
    contract = new InterestCalculatorMock();
    contract.reset();
  });

  it("calculates simple interest correctly", () => {
    const result = contract.calculateSimpleInterest(1000, 5, 1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(50);
  });

  it("rejects invalid principal for simple interest", () => {
    const result = contract.calculateSimpleInterest(0, 5, 1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PRINCIPAL);
  });

  it("calculates compound interest correctly", () => {
    const result = contract.calculateCompoundInterest(1000, 5, 1, 1);
    expect(result.ok).toBe(true);
    expect(result.value).toBeGreaterThan(50);
  });
  
  it("updates loan interest correctly", () => {
    contract.initializeLoan(1, 1000, 5, 12);
    const result = contract.updateLoanInterest(1, 112);
    expect(result.ok).toBe(true);
    expect(result.value).toBeGreaterThan(0);
  });

  it("sets and gets interest rate", () => {
    contract.setInterestRate(1, 6);
    const result = contract.getInterestRate(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(6);
  });

  it("rejects unauthorized set interest rate", () => {
    contract.caller = "ST2USER";
    const result = contract.setInterestRate(1, 6);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets and gets compounding frequency", () => {
    contract.setCompoundingFrequency(1, 4);
    const result = contract.getCompoundingFrequency(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(4);
  });

  it("calculates effective rate correctly", () => {
    const result = contract.calculateEffectiveRate(5, 12, 1);
    expect(result.ok).toBe(true);
    expect(result.value).toBeGreaterThan(5);
  });

  it("calculates future value correctly", () => {
    const result = contract.calculateFutureValue(1000, 5, 1, 12);
    expect(result.ok).toBe(true);
    expect(result.value).toBeGreaterThan(1000);
  });

  it("calculates present value correctly", () => {
    const result = contract.calculatePresentValue(1050, 5, 1, 1);
    expect(result.ok).toBe(true);
    expect(result.value).toBeLessThan(1050);
  });

  it("initializes and gets loan details", () => {
    contract.initializeLoan(1, 1000, 5, 12);
    const result = contract.getLoanDetails(1);
    expect(result.ok).toBe(true);
    expect(result.value.principal).toBe(1000);
  });

  it("rejects duplicate loan initialization", () => {
    contract.initializeLoan(1, 1000, 5, 12);
    const result = contract.initializeLoan(1, 2000, 6, 4);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_LOAN_ALREADY_EXISTS);
  });
});