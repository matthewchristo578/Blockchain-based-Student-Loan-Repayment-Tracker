# 📚 Blockchain-based Student Loan Repayment Tracker

Welcome to a transparent and immutable solution for tracking student loan repayments! This Web3 project uses the Stacks blockchain and Clarity smart contracts to address the real-world problem of opaque student loan systems, where borrowers often face unclear interest calculations, hidden fees, and disputes over payment history. By leveraging blockchain, we ensure every payment, interest accrual, and loan update is verifiable, reducing trust issues between borrowers and lenders while promoting financial literacy and fairness.

## ✨ Features

🔍 Transparent interest calculations based on predefined formulas  
💳 Immutable record of all payments and repayments  
📅 Automated repayment schedule generation and tracking  
👥 Secure registration for borrowers and lenders  
⚖️ Dispute resolution mechanism with on-chain evidence  
📊 Real-time loan status queries (balance, history, projections)  
🚫 Prevention of unauthorized modifications to loan terms  
🔒 Privacy-focused data storage (hashed personal info)  
💰 Support for crypto-based payments with fiat oracles if needed  

## 🛠 How It Works

This project consists of 8 Clarity smart contracts that interact to manage the entire student loan lifecycle. Here's a high-level overview:

1. **UserRegistry.clar**: Handles registration of borrowers and lenders, storing hashed identities and basic profiles to ensure only verified parties can participate.
2. **LoanCreation.clar**: Allows lenders to create new loan agreements with terms like principal, interest rate, duration, and repayment frequency. Borrowers must approve via signature.
3. **InterestCalculator.clar**: A dedicated contract for computing interest accruals using transparent formulas (e.g., simple or compound interest). It can be called periodically to update balances without ambiguity.
4. **PaymentTracker.clar**: Records all payments made by borrowers, emitting events for each transaction and updating the loan balance immutably.
5. **RepaymentSchedule.clar**: Generates a repayment plan based on loan terms and tracks progress, flagging missed payments or early repayments.
6. **DisputeResolver.clar**: Enables either party to raise disputes, locking funds if needed, and resolves them based on on-chain evidence or simple voting (for demo purposes).
7. **LoanStatusQuery.clar**: Provides read-only functions to query loan details, history, and projections, making it easy for users to verify status at any time.
8. **Admin Oversight.clar**: A governance contract for admins (e.g., platform operators) to update global parameters like interest formulas, while ensuring no retroactive changes to existing loans.

**For Borrowers**  
- Register via UserRegistry and approve a loan in LoanCreation.  
- Make payments through PaymentTracker, which triggers InterestCalculator and updates RepaymentSchedule.  
- Query your loan status anytime using LoanStatusQuery.  
- If there's an issue, initiate a dispute in DisputeResolver.  

**For Lenders**  
- Create loans and monitor repayments transparently.  
- Verify interest calculations and payment history on-chain.  
- Resolve disputes with immutable proof.  

**Technical Setup**  
- Deploy the contracts on the Stacks testnet or mainnet using Clarity.  
- Interact via a simple frontend (e.g., React app) that calls contract functions.  
- Use STX tokens for demo payments, or integrate oracles for fiat conversions.  

This setup solves the opacity in traditional student loans by making every calculation and transaction publicly verifiable, potentially reducing defaults and building trust in educational financing!