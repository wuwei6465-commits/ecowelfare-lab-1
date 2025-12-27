
# EcoWelfare Lab: Advanced Microeconomic Analysis Tool

**EcoWelfare Lab** is a sophisticated, interactive educational tool designed for advanced microeconomics and international trade curriculum. It visualizes and quantifies the welfare effects of various government interventions and market structures.

![EcoWelfare Screenshot](https://via.placeholder.com/800x400?text=EcoWelfare+Analysis+Dashboard)

## 🎯 Key Features

*   **Dynamic Market Visualization**: Real-time rendering of Supply & Demand curves with interactive intervention overlays.
*   **Welfare Quantification**: Automatic calculation of Consumer Surplus (CS), Producer Surplus (PS), Government Revenue, and Deadweight Loss (DWL).
*   **Efficiency Analysis**: Decomposes trade distortions into **Production Distortions** (efficiency loss from over/under production) and **Consumption Distortions** (loss from suboptimal consumption).
*   **Scenario Modeling**:
    *   **Autarky**: Market Equilibrium.
    *   **Price Controls**: Ceilings and Floors.
    *   **Fiscal Policy**: Specific Taxes.
    *   **Market Structure**: Monopoly (MR = MC Analysis).
    *   **International Trade**:
        *   Free Trade (Import/Export).
        *   Tariffs (Large & Small Country Models).
        *   Quotas.
        *   Export Subsidies.
*   **PDF Report Generation**: One-click export of the current analysis for assignments or teaching materials.

## 🚀 Getting Started

This project is built with **React**, **TypeScript**, and **Vite**.

### Prerequisites

*   Node.js (v14 or higher)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/ecowelfare-lab.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd ecowelfare-lab
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to the local link provided (usually `http://localhost:5173`).

## 📚 Economic Models Implemented

### 1. Closed Economy (Autarky)
Calculates standard equilibrium where $Q_d = Q_s$. Serves as the baseline for domestic interventions.

### 2. International Trade (Small Country)
Assumes the country is a price taker ($P_{world}$ is fixed).
*   **Tariff**: $P_{domestic} = P_{world} + t$.
*   **Quota**: Equilibrium determined where $Q_d - Q_s = Quota$.

### 3. International Trade (Large Country)
Assumes the country has market power.
*   **Terms of Trade (ToT)**: Models the impact of tariffs on lowering world prices, creating a Terms of Trade gain that may offset efficiency losses.

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript
*   **Styling**: Tailwind CSS
*   **Build Tool**: Vite
*   **Export**: html2canvas, jsPDF

## 📄 License

This project is open-source and available under the MIT License.
