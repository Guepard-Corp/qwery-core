export const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Evals Report</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --bg-color: #0f172a;
            --sidebar-bg: #1e293b;
            --text-color: #f8fafc;
            --accent-color: #3b82f6;
            --border-color: #334155;
            --success-color: #22c55e;
            --error-color: #ef4444;
            --card-bg: #1e293b;
            --hover-bg: #334155;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--bg-color);
            color: var(--text-color);
            height: 100vh;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <eval-report></eval-report>

    <script type="module">
        import { LitElement, html, css } from 'https://esm.sh/lit@3.1.2';
        import { when } from 'https://esm.sh/lit@3.1.2/directives/when.js';

        // --- EvalResultCard component ---
        /* EVAL_RESULT_CARD_SOURCE */

        // --- EvalInsights component ---
        /* EVAL_INSIGHTS_SOURCE */

        // --- EvalReport component ---
        /* EVAL_REPORT_SOURCE */
    </script>
</body>
</html>`;
