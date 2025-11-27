# CLI Agent Test Prompts

Use these prompts to test the agent functionality with the Google Sheet:
`https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv`

## Basic Test Sequence

### 1. Initial Query
```
list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv
```

### 2. Aggregation Queries
```
what is the average score?
what is the total score?
what is the minimum score?
what is the maximum score?
```

### 3. Filtering Queries
```
show me only people with score above 80
show me people with score below 70
show me people from Tunis
show me people older than 30
```

### 4. Sorting Queries
```
who has the highest score?
who has the lowest score?
show me the oldest person
show me the youngest person
```

### 5. Grouping/Aggregation Queries
```
count how many people are from each city
what is the average score by city?
show me the total score per city
how many people are in each age group?
```

### 6. Complex Queries
```
show me people with score above 80 sorted by age
what is the average age of people with score above 85?
show me the top 3 highest scores
show me people from Tunis or Sfax
```

### 7. Edge Cases
```
what is the average score? (repeat to test context)
show me all data (test if it remembers the sheet)
count total rows
how many unique cities are there?
```

### 8. Natural Language Variations
```
can you calculate the mean score?
find me the person with the best score
list everyone from the capital city
give me a breakdown by city
```

## Quick Test Script

Copy and paste this into the CLI:

```
list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv
what is the average score?
show me only people with score above 80
who has the highest score?
count how many people are from each city
what is the average age?
show me people from Tunis
/exit
```

## Expected Results

- **Initial query**: Should list all 11 rows with columns: id, name, age, city, score
- **Average score**: Should be approximately 74.73 (822/11)
- **Score above 80**: Should show 6 people (Ali, Sarah, Nour, Amal, Lina, Skander)
- **Highest score**: Should be Lina with 95
- **Count by city**: Should show counts for each city (Tunis: 1, Sfax: 1, etc.)
- **Context**: Follow-up questions should remember the sheet without needing the URL again

## Known Issues to Watch For

1. **Context loss**: Agent might ask for the sheet URL again in follow-ups
2. **Wrong answers**: Agent might answer previous question instead of current one
3. **SQL misclassification**: Queries starting with "show" might be misclassified as SQL
4. **Aggregation errors**: "what is the average score?" might list all rows instead of calculating

## Test Commands

### Run a single test:
```bash
cd /home/guepard/work/qwery-core/apps/cli
echo "list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv" | node dist/index.js
```

### Run multiple tests:
```bash
cd /home/guepard/work/qwery-core/apps/cli
(echo "list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv"; sleep 30; echo "what is the average score?"; sleep 30; echo "show me only people with score above 80"; sleep 30; echo "/exit") | node dist/index.js
```

### Interactive mode (recommended):
```bash
cd /home/guepard/work/qwery-core/apps/cli
node dist/index.js
```
Then paste the queries one by one.

