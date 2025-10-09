# Mathematical Concepts and Formulas

## Core Mathematical Principles

### Calculus Fundamentals
- **Derivative Definition**: The derivative of a function f(x) at point x is defined as lim(h→0) [f(x+h) - f(x)]/h
- **Chain Rule**: If y = f(g(x)), then dy/dx = f'(g(x)) × g'(x)
- **Product Rule**: If y = f(x) × g(x), then dy/dx = f'(x)g(x) + f(x)g'(x)
- **Quotient Rule**: If y = f(x)/g(x), then dy/dx = [f'(x)g(x) - f(x)g'(x)]/[g(x)]²
- **Integration by Parts**: ∫u dv = uv - ∫v du
- **Fundamental Theorem of Calculus**: ∫[a to b] f'(x) dx = f(b) - f(a)

### Linear Algebra Essentials
- **Matrix Multiplication**: For matrices A (m×n) and B (n×p), C = AB where c_ij = Σ(k=1 to n) a_ik × b_kj
- **Determinant Properties**: det(AB) = det(A) × det(B), det(A^T) = det(A)
- **Eigenvalues and Eigenvectors**: For matrix A, if Av = λv, then λ is eigenvalue and v is eigenvector
- **Vector Spaces**: A set V with operations + and × is a vector space if it satisfies closure, associativity, commutativity, identity, and distributivity
- **Linear Independence**: Vectors v₁, v₂, ..., vₙ are linearly independent if c₁v₁ + c₂v₂ + ... + cₙvₙ = 0 implies c₁ = c₂ = ... = cₙ = 0

### Probability and Statistics
- **Bayes' Theorem**: P(A|B) = P(B|A) × P(A) / P(B)
- **Central Limit Theorem**: As sample size n increases, sample mean approaches normal distribution with mean μ and variance σ²/n
- **Law of Large Numbers**: As n → ∞, sample mean converges to population mean
- **Conditional Probability**: P(A|B) = P(A∩B) / P(B)
- **Expected Value**: E[X] = Σ x × P(X=x) for discrete, E[X] = ∫ x × f(x) dx for continuous
- **Variance**: Var(X) = E[X²] - (E[X])²

### Discrete Mathematics
- **Set Theory**: Union (A∪B), Intersection (A∩B), Complement (A'), Cartesian Product (A×B)
- **Combinatorics**: Permutations P(n,r) = n!/(n-r)!, Combinations C(n,r) = n!/(r!(n-r)!)
- **Graph Theory**: A graph G = (V,E) where V is vertices and E is edges
- **Big O Notation**: f(n) = O(g(n)) if there exist constants c and n₀ such that f(n) ≤ c×g(n) for all n ≥ n₀
- **Recurrence Relations**: T(n) = aT(n/b) + f(n) for divide-and-conquer algorithms

### Number Theory
- **Euclidean Algorithm**: gcd(a,b) = gcd(b, a mod b)
- **Modular Arithmetic**: a ≡ b (mod n) means n divides (a-b)
- **Fermat's Little Theorem**: If p is prime and gcd(a,p) = 1, then a^(p-1) ≡ 1 (mod p)
- **Chinese Remainder Theorem**: If gcd(m,n) = 1, then the system x ≡ a (mod m), x ≡ b (mod n) has unique solution modulo mn

### Complex Analysis
- **Euler's Formula**: e^(iθ) = cos(θ) + i sin(θ)
- **Cauchy-Riemann Equations**: For f(z) = u(x,y) + iv(x,y) to be analytic: ∂u/∂x = ∂v/∂y and ∂u/∂y = -∂v/∂x
- **Residue Theorem**: ∫_C f(z) dz = 2πi × Σ Res(f, z_k) where z_k are poles inside contour C
- **Maximum Modulus Principle**: If f is analytic and non-constant in domain D, then |f| has no local maximum in D

### Differential Equations
- **First-Order Linear**: dy/dx + P(x)y = Q(x), solution: y = e^(-∫P(x)dx) × [∫Q(x)e^(∫P(x)dx)dx + C]
- **Second-Order Homogeneous**: ay'' + by' + cy = 0, characteristic equation: ar² + br + c = 0
- **Laplace Transform**: L{f(t)} = ∫[0 to ∞] e^(-st)f(t) dt
- **Separation of Variables**: For dy/dx = f(x)g(y), separate and integrate: ∫dy/g(y) = ∫f(x)dx

### Optimization Theory
- **Lagrange Multipliers**: To optimize f(x,y) subject to g(x,y) = 0, solve ∇f = λ∇g and g(x,y) = 0
- **Convex Functions**: f is convex if f(λx + (1-λ)y) ≤ λf(x) + (1-λ)f(y) for all λ ∈ [0,1]
- **Gradient Descent**: x_{n+1} = x_n - α∇f(x_n) where α is learning rate
- **Newton's Method**: x_{n+1} = x_n - f(x_n)/f'(x_n)

### Fourier Analysis
- **Fourier Series**: f(x) = a₀/2 + Σ[n=1 to ∞] [aₙcos(nπx/L) + bₙsin(nπx/L)]
- **Fourier Transform**: F(ω) = ∫[-∞ to ∞] f(t)e^(-iωt) dt
- **Parseval's Theorem**: ∫[-∞ to ∞] |f(t)|² dt = (1/2π)∫[-∞ to ∞] |F(ω)|² dω
- **Convolution**: (f*g)(t) = ∫[-∞ to ∞] f(τ)g(t-τ) dτ

### Topology and Geometry
- **Metric Spaces**: A set X with metric d satisfying: d(x,y) ≥ 0, d(x,y) = 0 iff x=y, d(x,y) = d(y,x), d(x,z) ≤ d(x,y) + d(y,z)
- **Continuity**: f is continuous at x₀ if for every ε > 0, there exists δ > 0 such that |x - x₀| < δ implies |f(x) - f(x₀)| < ε
- **Compactness**: A set is compact if every open cover has a finite subcover
- **Connectedness**: A topological space is connected if it cannot be written as union of two disjoint non-empty open sets

## Mathematical Problem-Solving Strategies

### Proof Techniques
- **Direct Proof**: Assume hypothesis, use logical steps to reach conclusion
- **Proof by Contradiction**: Assume conclusion is false, derive contradiction
- **Mathematical Induction**: Show P(1) is true, then show P(k) → P(k+1)
- **Proof by Cases**: Break problem into exhaustive cases
- **Counterexample**: Find single example that disproves statement

### Common Mathematical Patterns
- **Geometric Series**: Σ[n=0 to ∞] arⁿ = a/(1-r) for |r| < 1
- **Binomial Theorem**: (x+y)ⁿ = Σ[k=0 to n] C(n,k) x^(n-k) y^k
- **Taylor Series**: f(x) = Σ[n=0 to ∞] f^(n)(a)/n! × (x-a)ⁿ
- **L'Hôpital's Rule**: If lim f(x)/g(x) is 0/0 or ∞/∞, then lim f(x)/g(x) = lim f'(x)/g'(x)

### Computational Mathematics
- **Numerical Integration**: Trapezoidal rule, Simpson's rule, Monte Carlo methods
- **Root Finding**: Bisection method, Newton-Raphson, Secant method
- **Matrix Decomposition**: LU decomposition, QR decomposition, SVD
- **Interpolation**: Lagrange interpolation, Newton interpolation, spline interpolation

## Mathematical Applications

### Physics Applications
- **Classical Mechanics**: F = ma, E = ½mv², L = r × p (angular momentum)
- **Electromagnetism**: Maxwell's equations, Lorentz force F = q(E + v×B)
- **Quantum Mechanics**: Schrödinger equation, Heisenberg uncertainty principle
- **Thermodynamics**: First law dU = δQ - δW, Second law dS ≥ δQ/T

### Engineering Applications
- **Signal Processing**: Fourier transforms, filtering, sampling theorem
- **Control Theory**: Transfer functions, stability analysis, PID controllers
- **Optimization**: Linear programming, nonlinear programming, integer programming
- **Statistics**: Regression analysis, hypothesis testing, design of experiments

### Computer Science Applications
- **Algorithms**: Time complexity analysis, space complexity, asymptotic notation
- **Cryptography**: RSA algorithm, elliptic curve cryptography, hash functions
- **Machine Learning**: Gradient descent, backpropagation, regularization
- **Data Structures**: Trees, graphs, hash tables, dynamic programming
