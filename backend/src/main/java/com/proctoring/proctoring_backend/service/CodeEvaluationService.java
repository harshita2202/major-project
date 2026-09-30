package com.proctoring.proctoring_backend.service;

import com.proctoring.proctoring_backend.entity.TestCase;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CodeEvaluationService {

    public static class TestCaseResult {
        private int testCaseNumber;
        private boolean passed;
        private boolean isSample;
        private String input;
        private String expectedOutput;
        private String actualOutput;
        private String error;
        private int marks;

        public TestCaseResult() {}

        public TestCaseResult(int testCaseNumber, boolean passed, boolean isSample, String input,
                              String expectedOutput, String actualOutput, String error, int marks) {
            this.testCaseNumber = testCaseNumber;
            this.passed = passed;
            this.isSample = isSample;
            this.input = input;
            this.expectedOutput = expectedOutput;
            this.actualOutput = actualOutput;
            this.error = error;
            this.marks = marks;
        }

        public int getTestCaseNumber() { return testCaseNumber; }
        public boolean isPassed() { return passed; }
        public boolean isSample() { return isSample; }
        public String getInput() { return input; }
        public String getExpectedOutput() { return expectedOutput; }
        public String getActualOutput() { return actualOutput; }
        public String getError() { return error; }
        public int getMarks() { return marks; }
    }

    public static class CodeEvaluationSummary {
        private int totalTestCases;
        private int passedTestCases;
        private int totalMarks;
        private int marksEarned;
        private List<TestCaseResult> results = new ArrayList<>();

        public int getTotalTestCases() { return totalTestCases; }
        public void setTotalTestCases(int totalTestCases) { this.totalTestCases = totalTestCases; }

        public int getPassedTestCases() { return passedTestCases; }
        public void setPassedTestCases(int passedTestCases) { this.passedTestCases = passedTestCases; }

        public int getTotalMarks() { return totalMarks; }
        public void setTotalMarks(int totalMarks) { this.totalMarks = totalMarks; }

        public int getMarksEarned() { return marksEarned; }
        public void setMarksEarned(int marksEarned) { this.marksEarned = marksEarned; }

        public List<TestCaseResult> getResults() { return results; }
        public void setResults(List<TestCaseResult> results) { this.results = results; }
    }

    /**
     * Evaluates source code against a list of test cases.
     */
    public CodeEvaluationSummary evaluate(String language, String sourceCode, List<TestCase> testCases, int questionMarks) {
        CodeEvaluationSummary summary = new CodeEvaluationSummary();
        if (testCases == null || testCases.isEmpty()) {
            summary.setTotalTestCases(0);
            summary.setPassedTestCases(0);
            summary.setTotalMarks(questionMarks);
            // Award marks if meaningful code written when no test cases exist
            if (sourceCode != null && sourceCode.trim().length() > 20) {
                summary.setMarksEarned(questionMarks);
            } else {
                summary.setMarksEarned(0);
            }
            return summary;
        }

        summary.setTotalTestCases(testCases.size());
        summary.setTotalMarks(questionMarks);

        int passedCount = 0;
        int totalWeight = 0;
        int earnedWeight = 0;
        int caseNum = 1;

        for (TestCase tc : testCases) {
            int weight = tc.getMarks() > 0 ? tc.getMarks() : 1;
            totalWeight += weight;

            TestCaseResult res = executeTestCase(language, sourceCode, tc, caseNum++);
            summary.getResults().add(res);

            if (res.isPassed()) {
                passedCount++;
                earnedWeight += weight;
            }
        }

        summary.setPassedTestCases(passedCount);

        // Proportionally calculate marks earned
        if (totalWeight > 0) {
            int earned = Math.round(((float) earnedWeight / totalWeight) * questionMarks);
            summary.setMarksEarned(earned);
        } else {
            summary.setMarksEarned(0);
        }

        return summary;
    }

    private TestCaseResult executeTestCase(String language, String sourceCode, TestCase tc, int caseNum) {
        if (sourceCode == null || sourceCode.trim().isEmpty()) {
            return new TestCaseResult(caseNum, false, tc.isSample(), tc.getInput(),
                    tc.getExpectedOutput(), "", "No code submitted", tc.getMarks());
        }

        String lang = language != null ? language.toLowerCase().trim() : "javascript";
        String expected = tc.getExpectedOutput() != null ? tc.getExpectedOutput().trim() : "";
        String input = tc.getInput() != null ? tc.getInput().trim() : "";

        try {
            String actual = "";
            if (lang.contains("python") || lang.equals("py")) {
                actual = runPythonCode(sourceCode, input);
            } else {
                actual = runJavascriptCode(sourceCode, input);
            }

            actual = normalizeOutput(actual);
            String normExpected = normalizeOutput(expected);

            boolean passed = isOutputMatching(normExpected, actual);

            return new TestCaseResult(caseNum, passed, tc.isSample(), input, expected, actual, null, tc.getMarks());
        } catch (Exception e) {
            return new TestCaseResult(caseNum, false, tc.isSample(), input, expected, "",
                    e.getMessage() != null ? e.getMessage() : "Execution error", tc.getMarks());
        }
    }

    private boolean isOutputMatching(String expected, String actual) {
        if (expected == null && actual == null) return true;
        if (expected == null || actual == null) return false;
        if (expected.equals(actual)) return true;

        // Strip surrounding quotes if JSON or string
        String expClean = cleanQuotes(expected);
        String actClean = cleanQuotes(actual);
        if (expClean.equalsIgnoreCase(actClean)) return true;

        // Try numeric comparison
        try {
            double dExp = Double.parseDouble(expClean);
            double dAct = Double.parseDouble(actClean);
            return Math.abs(dExp - dAct) < 0.0001;
        } catch (NumberFormatException ignored) {}

        return false;
    }

    private String cleanQuotes(String s) {
        if (s == null) return "";
        s = s.trim();
        if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'"))) {
            return s.substring(1, s.length() - 1).trim();
        }
        return s;
    }

    private String normalizeOutput(String s) {
        if (s == null) return "";
        return s.trim().replaceAll("\\r\\n", "\n").replaceAll("\\r", "\n").trim();
    }

    private String runJavascriptCode(String sourceCode, String input) throws Exception {
        // Construct runnable JavaScript script
        StringBuilder script = new StringBuilder();
        script.append(sourceCode).append("\n\n");

        if (input != null && !input.isEmpty()) {
            if (input.matches("^[a-zA-Z_$][a-zA-Z0-9_$]*\\s*\\(.*\\);?$")) {
                // Input is already a function invocation e.g. reverseString('hello')
                script.append("try {\n");
                script.append("  const __res = ").append(input.endsWith(";") ? input.substring(0, input.length() - 1) : input).append(";\n");
                script.append("  if (__res !== undefined) console.log(typeof __res === 'object' ? JSON.stringify(__res) : __res);\n");
                script.append("} catch(err) { console.error(err.message); }\n");
            } else {
                // Find primary function name in code
                String funcName = detectFunctionName(sourceCode);
                if (funcName != null) {
                    script.append("try {\n");
                    script.append("  let __arg = ").append(formatJsArg(input)).append(";\n");
                    script.append("  let __res = ").append(funcName).append("(__arg);\n");
                    script.append("  if (__res !== undefined) console.log(typeof __res === 'object' ? JSON.stringify(__res) : __res);\n");
                    script.append("} catch(err) { console.error(err.message); }\n");
                }
            }
        }

        return executeProcess(new String[]{"node", "-e", script.toString()}, input);
    }

    private String runPythonCode(String sourceCode, String input) throws Exception {
        StringBuilder script = new StringBuilder();
        script.append(sourceCode).append("\n\n");

        if (input != null && !input.isEmpty()) {
            if (input.matches("^[a-zA-Z_$][a-zA-Z0-9_$]*\\s*\\(.*\\)$")) {
                script.append("import json\n");
                script.append("try:\n");
                script.append("    __res = ").append(input).append("\n");
                script.append("    if __res is not None:\n");
                script.append("        print(json.dumps(__res) if isinstance(__res, (list, dict)) else __res)\n");
                script.append("except Exception as __e:\n");
                script.append("    print('Error:', __e)\n");
            } else {
                String funcName = detectPythonFunctionName(sourceCode);
                if (funcName != null) {
                    script.append("import json\n");
                    script.append("try:\n");
                    script.append("    __arg = ").append(formatPythonArg(input)).append("\n");
                    script.append("    __res = ").append(funcName).append("(__arg)\n");
                    script.append("    if __res is not None:\n");
                    script.append("        print(json.dumps(__res) if isinstance(__res, (list, dict)) else __res)\n");
                    script.append("except Exception as __e:\n");
                    script.append("    print('Error:', __e)\n");
                }
            }
        }

        return executeProcess(new String[]{"python", "-c", script.toString()}, input);
    }

    private String executeProcess(String[] command, String stdinInput) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process p = pb.start();

        if (stdinInput != null && !stdinInput.isEmpty()) {
            try (OutputStream os = p.getOutputStream()) {
                os.write(stdinInput.getBytes(StandardCharsets.UTF_8));
                os.flush();
            } catch (Exception ignored) {}
        }

        boolean finished = p.waitFor(4, TimeUnit.SECONDS);
        if (!finished) {
            p.destroyForcibly();
            throw new RuntimeException("Execution timed out (limit: 4s)");
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder out = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (out.length() > 0) out.append("\n");
                out.append(line);
            }
            return out.toString();
        }
    }

    private String detectFunctionName(String code) {
        Pattern pattern = Pattern.compile("function\\s+([a-zA-Z0-9_$]+)\\s*\\(");
        Matcher matcher = pattern.matcher(code);
        if (matcher.find()) return matcher.group(1);

        Pattern arrowPattern = Pattern.compile("(?:const|let|var)\\s+([a-zA-Z0-9_$]+)\\s*=\\s*(?:function|\\([^)]*\\)\\s*=>)");
        Matcher arrowMatcher = arrowPattern.matcher(code);
        if (arrowMatcher.find()) return arrowMatcher.group(1);

        return null;
    }

    private String detectPythonFunctionName(String code) {
        Pattern pattern = Pattern.compile("def\\s+([a-zA-Z0-9_]+)\\s*\\(");
        Matcher matcher = pattern.matcher(code);
        if (matcher.find()) return matcher.group(1);
        return null;
    }

    private String formatJsArg(String input) {
        input = input.trim();
        if (input.startsWith("[") || input.startsWith("{") || input.equals("true") || input.equals("false") || input.matches("^-?\\d+(\\.\\d+)?$")) {
            return input;
        }
        return "\"" + input.replace("\"", "\\\"") + "\"";
    }

    private String formatPythonArg(String input) {
        input = input.trim();
        if (input.startsWith("[") || input.startsWith("{") || input.equals("True") || input.equals("False") || input.matches("^-?\\d+(\\.\\d+)?$")) {
            return input;
        }
        if (input.equals("true")) return "True";
        if (input.equals("false")) return "False";
        return "\"" + input.replace("\"", "\\\"") + "\"";
    }
}
