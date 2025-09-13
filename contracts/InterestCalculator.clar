(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PRINCIPAL u101)
(define-constant ERR-INVALID-RATE u102)
(define-constant ERR-INVALID-PERIODS u103)
(define-constant ERR-INVALID-FREQUENCY u104)
(define-constant ERR-LOAN-NOT-FOUND u105)
(define-constant ERR-DIVISION-BY-ZERO u107)
(define-constant ERR-LOAN-ALREADY-EXISTS u114)
(define-constant PRECISION u1000000)
(define-constant MAX_RATE u2000)
(define-constant MIN_FREQUENCY u1)
(define-constant DAYS-IN-YEAR u365)
(define-constant MONTHS-IN-YEAR u12)

(define-data-var admin principal tx-sender)

(define-map loan-details uint {principal: uint, rate: uint, start-time: uint, frequency: uint})
(define-map interest-rates uint uint)
(define-map compounding-frequencies uint uint)

(define-private (mul-fixed (a uint) (b uint)) (/ (* a b) PRECISION))
(define-private (div-fixed (a uint) (b uint)) (/ (* a PRECISION) b))
(define-private (add-fixed (a uint) (b uint)) (+ a b))
(define-private (sub-fixed (a uint) (b uint)) (if (>= a b) (- a b) u0))

(define-public (calculate-simple-interest (principal uint) (rate uint) (time uint))
  (begin
    (try! (validate-principal principal))
    (try! (validate-rate rate))
    (try! (validate-periods time))
    (ok (mul-fixed (* principal rate time) (div-fixed u1 u100)))
  )
)

(define-public (calculate-compound-interest (principal uint) (rate uint) (periods uint) (frequency uint))
  (let
    (
      (rate-fixed (div-fixed rate u100))
      (one-plus-rate (add-fixed u1 (div-fixed rate-fixed frequency)))
      (compounded (pow one-plus-rate (* periods frequency)))
    )
    (begin
      (try! (validate-principal principal))
      (try! (validate-rate rate))
      (try! (validate-periods periods))
      (try! (validate-frequency frequency))
      (ok (sub-fixed (mul-fixed principal compounded) principal))
    )
  )
)

(define-public (calculate-amortized-payment (principal uint) (rate uint) (periods uint))
  (let
    (
      (monthly-rate (div-fixed rate (* u100 MONTHS-IN-YEAR)))
      (one-plus-rate (add-fixed u1 monthly-rate))
      (pow-term (pow one-plus-rate periods))
      (numerator (mul-fixed principal (mul-fixed monthly-rate pow-term)))
      (denominator (sub-fixed pow-term u1))
    )
    (begin
      (try! (validate-principal principal))
      (try! (validate-rate rate))
      (try! (validate-periods periods))
      (if (is-eq denominator u0) (err ERR-DIVISION-BY-ZERO) (ok (div-fixed numerator denominator)))
    )
  )
)

(define-public (update-loan-interest (loan-id uint) (current-time uint))
  (let
    (
      (loan (unwrap! (map-get? loan-details loan-id) (err ERR-LOAN-NOT-FOUND)))
      (principal (get principal loan))
      (rate (get rate loan))
      (start-time (get start-time loan))
      (frequency (get frequency loan))
      (time-elapsed (- current-time start-time))
    )
    (begin
      (try! (validate-periods time-elapsed))
      (ok (try! (calculate-compound-interest principal rate (/ time-elapsed frequency) frequency)))
    )
  )
)

(define-public (get-interest-rate (loan-id uint))
  (ok (unwrap! (map-get? interest-rates loan-id) (err ERR_LOAN_NOT_FOUND)))
)

(define-public (set-interest-rate (loan-id uint) (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-rate new-rate))
    (map-set interest-rates loan-id new-rate)
    (ok true)
  )
)

(define-public (get-compounding-frequency (loan-id uint))
  (ok (unwrap! (map-get? compounding-frequencies loan-id) (err ERR_LOAN_NOT_FOUND)))
)

(define-public (set-compounding-frequency (loan-id uint) (new-frequency uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-frequency new-frequency))
    (map-set compounding-frequencies loan-id new-frequency)
    (ok true)
  )
)

(define-public (calculate-effective-rate (nominal-rate uint) (frequency uint) (periods uint))
  (let
    (
      (rate-fixed (div-fixed nominal-rate u100))
      (one-plus-rate (add-fixed u1 (div-fixed rate-fixed frequency)))
      (effective (sub-fixed (pow one-plus-rate (* frequency periods)) u1))
    )
    (begin
      (try! (validate-rate nominal-rate))
      (try! (validate-frequency frequency))
      (try! (validate-periods periods))
      (ok (mul-fixed effective u100))
    )
  )
)

(define-public (calculate-future-value (principal uint) (rate uint) (periods uint) (frequency uint))
  (let
    (
      (rate-fixed (div-fixed rate u100))
      (one-plus-rate (add-fixed u1 (div-fixed rate-fixed frequency)))
      (fv (mul-fixed principal (pow one-plus-rate (* periods frequency))))
    )
    (begin
      (try! (validate-principal principal))
      (try! (validate-rate rate))
      (try! (validate-periods periods))
      (try! (validate-frequency frequency))
      (ok fv)
    )
  )
)

(define-public (calculate-present-value (future-value uint) (rate uint) (periods uint) (frequency uint))
  (let
    (
      (rate-fixed (div-fixed rate u100))
      (one-plus-rate (add-fixed u1 (div-fixed rate-fixed frequency)))
      (discount-factor (pow one-plus-rate (* periods frequency)))
    )
    (begin
      (try! (validate-principal future-value))
      (try! (validate-rate rate))
      (try! (validate-periods periods))
      (try! (validate-frequency frequency))
      (if (is-eq discount-factor u0) (err ERR-DIVISION-BY-ZERO) (ok (div-fixed future-value discount-factor)))
    )
  )
)

(define-public (calculate-accrued-interest-daily (principal uint) (rate uint) (days uint))
  (let
    (
      (daily-rate (div-fixed rate (* u100 DAYS-IN-YEAR)))
    )
    (begin
      (try! (validate-principal principal))
      (try! (validate-rate rate))
      (try! (validate-periods days))
      (ok (mul-fixed principal (mul-fixed daily-rate days)))
    )
  )
)

(define-public (calculate-accrued-interest-monthly (principal uint) (rate uint) (months uint))
  (let
    (
      (monthly-rate (div-fixed rate (* u100 MONTHS-IN-YEAR)))
    )
    (begin
      (try! (validate-principal principal))
      (try! (validate-rate rate))
      (try! (validate-periods months))
      (ok (mul-fixed principal (mul-fixed monthly-rate months)))
    )
  )
)

(define-public (calculate-accrued-interest-annually (principal uint) (rate uint) (years uint))
  (begin
    (try! (validate-principal principal))
    (try! (validate-rate rate))
    (try! (validate-periods years))
    (ok (mul-fixed principal (mul-fixed (div-fixed rate u100) years)))
  )
)

(define-private (validate-principal (p uint))
  (if (> p u0) (ok true) (err ERR-INVALID-PRINCIPAL))
)

(define-private (validate-rate (r uint))
  (if (and (> r u0) (<= r MAX_RATE)) (ok true) (err ERR-INVALID-RATE))
)

(define-private (validate-periods (per uint))
  (if (> per u0) (ok true) (err ERR-INVALID-PERIODS))
)

(define-private (validate-frequency (f uint))
  (if (>= f MIN_FREQUENCY) (ok true) (err ERR-INVALID-FREQUENCY))
)

(define-public (get-loan-details (loan-id uint))
  (ok (unwrap! (map-get? loan-details loan-id) (err ERR-LOAN-NOT-FOUND)))
)

(define-public (initialize-loan (loan-id uint) (principal uint) (rate uint) (frequency uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-principal principal))
    (try! (validate-rate rate))
    (try! (validate-frequency frequency))
    (asserts! (is-none (map-get? loan-details loan-id)) (err ERR-LOAN-ALREADY-EXISTS))
    (map-set loan-details loan-id {principal: principal, rate: rate, start-time: block-height, frequency: frequency})
    (map-set interest-rates loan-id rate)
    (map-set compounding-frequencies loan-id frequency)
    (ok true)
  )
)