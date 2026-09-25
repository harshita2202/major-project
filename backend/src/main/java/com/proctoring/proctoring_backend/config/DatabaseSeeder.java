package com.proctoring.proctoring_backend.config;

import com.proctoring.proctoring_backend.entity.*;
import com.proctoring.proctoring_backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final CandidateRepository candidateRepository;
    private final StudentRepository studentRepository;
    private final ViolationRepository violationRepository;
    private final UserRepository userRepository;
    private final ExamSessionRepository examSessionRepository;

    public DatabaseSeeder(ExamRepository examRepository,
                          QuestionRepository questionRepository,
                          CandidateRepository candidateRepository,
                          StudentRepository studentRepository,
                          ViolationRepository violationRepository,
                          UserRepository userRepository,
                          ExamSessionRepository examSessionRepository) {
        this.examRepository = examRepository;
        this.questionRepository = questionRepository;
        this.candidateRepository = candidateRepository;
        this.studentRepository = studentRepository;
        this.violationRepository = violationRepository;
        this.userRepository = userRepository;
        this.examSessionRepository = examSessionRepository;
    }

    @Override
    public void run(String... args) {
        if (examRepository.count() > 0) {
            System.out.println("Database already contains exams, skipping seeding.");
            return;
        }

        System.out.println("Seeding database with live exams, questions, candidates, and students...");

        // 1. Seed Exams
        Exam exam1 = new Exam(
                "exam-1",
                "CS301",
                "CS301 - Data Structures & Algorithms",
                "Mid-term examination covering Trees, Graphs, Sorting Algorithms, and Dynamic Programming.",
                "Today",
                "10:00 AM - 12:00 PM",
                "120 mins",
                45,
                "in-progress",
                "Full AI + Screen Lock",
                "mcq",
                3
        );

        Exam exam2 = new Exam(
                "exam-2",
                "CS501",
                "CS501 - Advanced Coding & Algorithm Lab",
                "Hands-on programming and practical implementation test with strict anti-copy/paste verification.",
                "Today",
                "02:00 PM - 04:00 PM",
                "90 mins",
                38,
                "active",
                "AI + Anti-Copy Sandbox",
                "coding",
                3
        );

        Exam exam3 = new Exam(
                "exam-3",
                "EE205",
                "EE205 - Signals and Systems",
                "Comprehensive evaluation on Fourier transforms, Laplace transforms, and continuous-time LTI systems.",
                "Tomorrow",
                "09:00 AM - 11:30 AM",
                "150 mins",
                62,
                "upcoming",
                "Full AI",
                "mcq",
                2
        );

        examRepository.saveAll(List.of(exam1, exam2, exam3));

        // 2. Seed Questions for exam-1 (MCQ)
        Question q1 = new Question(
                "q-101",
                "exam-1",
                "mcq",
                "Worst-Case Complexity of QuickSort",
                "What is the worst-case time complexity of the QuickSort algorithm when the pivot chosen is always the maximum or minimum element?",
                "[\"O(n log n)\", \"O(n²)\", \"O(log n)\", \"O(n)\"]",
                1,
                "Medium",
                "[]",
                "[]",
                "{}"
        );

        Question q2 = new Question(
                "q-102",
                "exam-1",
                "mcq",
                "FIFO Data Structure",
                "Which data structure operates strictly under the FIFO (First-In, First-Out) order of operations?",
                "[\"Stack\", \"Queue\", \"Binary Search Tree\", \"Max Heap\"]",
                1,
                "Easy",
                "[]",
                "[]",
                "{}"
        );

        Question q3 = new Question(
                "q-103",
                "exam-1",
                "mcq",
                "Min-Heap Root Element",
                "In a valid minimum binary heap containing distinct integers, where is the smallest element guaranteed to reside?",
                "[\"At the deepest leaf node\", \"At the root node\", \"At the leftmost leaf node\", \"At any node in level 1\"]",
                1,
                "Easy",
                "[]",
                "[]",
                "{}"
        );

        // 3. Seed Questions for exam-2 (CS501 Coding Assessment with Copy/Paste test)
        Question q4 = new Question(
                "q-201",
                "exam-2",
                "coding",
                "Reverse a String In-Place",
                "Write a function `reverseString(str)` that accepts a string as an argument and returns the reversed string without using JavaScript's native `reverse()` method.\n\n*Anti-Cheat Note: Copy & Paste is strictly prohibited in this test area. Please type out your logic manually.*",
                "[]",
                null,
                "Easy",
                "[{\"input\":\"reverseString('hello')\",\"output\":\"'olleh'\",\"explanation\":\"Reversed letters of hello\"},{\"input\":\"reverseString('algorithm')\",\"output\":\"'mhtirogla'\",\"explanation\":\"Reversed letters of algorithm\"}]",
                "[\"Input string length between 1 and 10^4\", \"Do not invoke str.reverse()\", \"Must run in O(n) time complexity\"]",
                "{\"javascript\":\"function reverseString(str) {\\n  // Write your code here (Paste is blocked - type manually!)\\n  let reversed = '';\\n  for (let i = str.length - 1; i >= 0; i--) {\\n    reversed += str[i];\\n  }\\n  return reversed;\\n}\",\"python\":\"def reverse_string(s):\\n    # Write your solution here\\n    return s[::-1]\"}"
        );

        Question q5 = new Question(
                "q-202",
                "exam-2",
                "coding",
                "Two Sum Problem",
                "Given an array of integers `nums` and an integer `target`, return the two indices whose elements add up to `target`. You may assume each input has exactly one solution, and you may not use the same element twice.",
                "[]",
                null,
                "Medium",
                "[{\"input\":\"twoSum([2, 7, 11, 15], 9)\",\"output\":\"[0, 1]\",\"explanation\":\"nums[0] + nums[1] == 2 + 7 == 9\"},{\"input\":\"twoSum([3, 2, 4], 6)\",\"output\":\"[1, 2]\",\"explanation\":\"nums[1] + nums[2] == 2 + 4 == 6\"}]",
                "[\"2 <= nums.length <= 10^4\", \"-10^9 <= nums[i] <= 10^9\", \"Only one valid answer exists\"]",
                "{\"javascript\":\"function twoSum(nums, target) {\\n  // Anti-cheat active: typing required\\n  const map = new Map();\\n  for (let i = 0; i < nums.length; i++) {\\n    const complement = target - nums[i];\\n    if (map.has(complement)) {\\n      return [map.get(complement), i];\\n    }\\n    map.set(nums[i], i);\\n  }\\n  return [];\\n}\",\"python\":\"def two_sum(nums, target):\\n    seen = {}\\n    for i, num in enumerate(nums):\\n        comp = target - num\\n        if comp in seen:\\n            return [seen[comp], i]\\n        seen[num] = i\\n    return []\"}"
        );

        Question q6 = new Question(
                "q-203",
                "exam-2",
                "coding",
                "Valid Palindrome Integer",
                "Given an integer `x`, return `true` if `x` is a palindrome integer, and `false` otherwise. An integer is a palindrome when it reads the same backward as forward.",
                "[]",
                null,
                "Easy",
                "[{\"input\":\"isPalindrome(121)\",\"output\":\"true\",\"explanation\":\"121 reads as 121 from left to right and from right to left.\"},{\"input\":\"isPalindrome(-121)\",\"output\":\"false\",\"explanation\":\"From left to right it reads -121. From right to left it becomes 121-.\"}]",
                "[\"-2^31 <= x <= 2^31 - 1\"]",
                "{\"javascript\":\"function isPalindrome(x) {\\n  if (x < 0) return false;\\n  const s = x.toString();\\n  return s === s.split('').reverse().join('');\\n}\",\"python\":\"def is_palindrome(x):\\n    if x < 0: return False\\n    s = str(x)\\n    return s == s[::-1]\"}"
        );

        questionRepository.saveAll(List.of(q1, q2, q3, q4, q5, q6));

        // 4. Seed Live Candidates
        Candidate c1 = new Candidate(
                "cand-1",
                "Alex Morgan",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
                "alex.morgan@university.edu",
                "CS301 - Data Structures & Algorithms",
                "01:24:15",
                "02:00:00",
                65,
                "active",
                "low",
                12,
                "{\"faceDetection\":\"passed\",\"audioLevel\":\"normal\",\"tabSwitches\":0,\"gazeTracking\":\"focused\"}",
                "[]"
        );

        Candidate c2 = new Candidate(
                "cand-2",
                "David Chen",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
                "david.chen@university.edu",
                "CS501 - Advanced Coding & Algorithm Lab",
                "00:48:30",
                "01:30:00",
                42,
                "active",
                "medium",
                45,
                "{\"faceDetection\":\"warning\",\"audioLevel\":\"normal\",\"tabSwitches\":1,\"gazeTracking\":\"distracted\"}",
                "[]"
        );

        Candidate c3 = new Candidate(
                "cand-3",
                "Sarah Jenkins",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
                "sarah.j@university.edu",
                "CS301 - Data Structures & Algorithms",
                "01:45:00",
                "02:00:00",
                15,
                "active",
                "high",
                82,
                "{\"faceDetection\":\"failed\",\"audioLevel\":\"elevated\",\"tabSwitches\":3,\"gazeTracking\":\"away\"}",
                "[]"
        );

        Candidate c4 = new Candidate(
                "cand-4",
                "Marcus Brody",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
                "m.brody@university.edu",
                "CS501 - Advanced Coding & Algorithm Lab",
                "01:10:20",
                "01:30:00",
                80,
                "active",
                "low",
                5,
                "{\"faceDetection\":\"passed\",\"audioLevel\":\"normal\",\"tabSwitches\":0,\"gazeTracking\":\"focused\"}",
                "[]"
        );

        candidateRepository.saveAll(List.of(c1, c2, c3, c4));

        // 5. Seed Students
        Student s1 = new Student("STU001", "Alex Morgan", "alex.morgan@university.edu", "CS301 - Data Structures", "Active", "low", "2 mins ago");
        Student s2 = new Student("STU002", "David Chen", "david.chen@university.edu", "CS501 - Coding Lab", "Active", "medium", "Just now");
        Student s3 = new Student("STU003", "Sarah Jenkins", "sarah.j@university.edu", "CS301 - Data Structures", "Flagged", "high", "5 mins ago");
        Student s4 = new Student("STU004", "Marcus Brody", "m.brody@university.edu", "CS501 - Coding Lab", "Active", "low", "1 min ago");
        Student s5 = new Student("STU005", "Emma Watson", "emma.w@university.edu", "EE205 - Signals & Systems", "Offline", "low", "1 hour ago");

        studentRepository.saveAll(List.of(s1, s2, s3, s4, s5));

        // 6. Seed Violations
        Violation v1 = new Violation("VIO-101", "cand-3", "Sarah Jenkins",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
                "CS301 - Data Structures & Algorithms", "Multiple Faces Detected", "high", "10:14:22", "pending",
                "Second face appeared in webcam feed for 4.2 seconds");

        Violation v2 = new Violation("VIO-102", "cand-2", "David Chen",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
                "CS501 - Advanced Coding & Algorithm Lab", "Tab Switch Detected", "medium", "10:22:05", "reviewed",
                "Candidate switched browser window to another application");

        Violation v3 = new Violation("VIO-103", "cand-3", "Sarah Jenkins",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
                "CS301 - Data Structures & Algorithms", "Background Voice Detected", "high", "10:35:18", "pending",
                "Audio analysis detected whisper audio above 68dB");

        violationRepository.saveAll(List.of(v1, v2, v3));

        // 7. Seed Users
        User u1 = new User("STU001", "alex.morgan", "alex.morgan@university.edu", "Alex Morgan", "CANDIDATE", "ACTIVE");
        User u2 = new User("STU002", "david.chen", "david.chen@university.edu", "David Chen", "CANDIDATE", "ACTIVE");
        User u3 = new User("INV001", "robert.vance", "robert.vance@university.edu", "Dr. Robert Vance", "INVIGILATOR", "ACTIVE");
        User u4 = new User("ADM001", "admin", "admin@university.edu", "System Administrator", "ADMIN", "ACTIVE");

        userRepository.saveAll(List.of(u1, u2, u3, u4));

        // 8. Seed Sample Active Exam Session
        ExamSession session1 = new ExamSession(
                "session-demo-1",
                "exam-1",
                "STU001",
                "Alex Morgan",
                5040
        );
        examSessionRepository.save(session1);

        System.out.println("Database seeding completed successfully.");
    }
}
