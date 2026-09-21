/**
 * mockExamData.js
 * Mock questions and exam metadata for the Student Exam-Taking experience.
 *
 * Future integration:
 *   GET /api/exams/:examId           → exam metadata
 *   GET /api/exams/:examId/questions → question list
 *
 * NOTE: Do NOT call these endpoints — they do not exist yet in the backend.
 */

export const MOCK_EXAMS_META = {
  '1': {
    id: '1',
    title: 'Data Structures & Algorithms',
    course: 'CS-301',
    instructor: 'Dr. Ananya Sharma',
    institution: 'Proctortrack University',
    durationMinutes: 60,
    totalQuestions: 20,
    securityMode: 'Strict',
    maxTabSwitchWarnings: 3,
    candidateName: 'Alex Johnson',
    candidateId: 'STU-2024-0042',
  },
  '2': {
    id: '2',
    title: 'Database Management Systems',
    course: 'CS-402',
    instructor: 'Prof. Rajan Mehta',
    institution: 'Proctortrack University',
    durationMinutes: 90,
    totalQuestions: 15,
    securityMode: 'Moderate',
    maxTabSwitchWarnings: 5,
    candidateName: 'Alex Johnson',
    candidateId: 'STU-2024-0042',
  },
  'coding': {
    id: 'coding',
    title: 'Practical Coding Assessment (Anti-Paste Proctor)',
    course: 'CS-501',
    instructor: 'Prof. Vikram Roy',
    institution: 'Proctortrack University',
    durationMinutes: 45,
    totalQuestions: 3,
    type: 'coding',
    securityMode: 'Strict AI + Anti-Paste Lockdown',
    maxTabSwitchWarnings: 3,
    candidateName: 'Alex Johnson',
    candidateId: 'STU001',
    description: 'Solve real-world algorithmic problems. Clipboard copy, paste, and cut are strictly intercepted and logged.',
  },
};

/** Fallback exam metadata when examId is unknown */
export const DEFAULT_EXAM_META = {
  id: 'demo',
  title: 'ProctorTrack™ Demo Examination',
  course: 'DEMO-101',
  instructor: 'Verificient Technologies',
  institution: 'Proctortrack University',
  durationMinutes: 30,
  totalQuestions: 10,
  securityMode: 'Strict',
  maxTabSwitchWarnings: 3,
  candidateName: 'Demo Candidate',
  candidateId: 'STU-DEMO-0001',
};

export const MOCK_QUESTIONS = [
  {
    id: 1,
    question: 'What is the time complexity of binary search on a sorted array of n elements?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correctIndex: 1,
  },
  {
    id: 2,
    question: 'Which data structure operates on the LIFO (Last In, First Out) principle?',
    options: ['Queue', 'Linked List', 'Stack', 'Binary Tree'],
    correctIndex: 2,
  },
  {
    id: 3,
    question: 'What is the worst-case time complexity of QuickSort?',
    options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
    correctIndex: 1,
  },
  {
    id: 4,
    question: 'In a min-heap, the root always contains:',
    options: [
      'The maximum element',
      'The median element',
      'The minimum element',
      'A random element',
    ],
    correctIndex: 2,
  },
  {
    id: 5,
    question: 'Which traversal of a binary search tree gives elements in sorted order?',
    options: ['Pre-order', 'Post-order', 'Level-order', 'In-order'],
    correctIndex: 3,
  },
  {
    id: 6,
    question: 'A hash table has an average-case time complexity of _____ for search operations.',
    options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
    correctIndex: 2,
  },
  {
    id: 7,
    question:
      'Which algorithm is used to find the shortest path in a graph with non-negative edge weights?',
    options: ["Bellman-Ford", "Floyd-Warshall", "Prim's Algorithm", "Dijkstra's Algorithm"],
    correctIndex: 3,
  },
  {
    id: 8,
    question: 'What is the space complexity of merge sort?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctIndex: 2,
  },
  {
    id: 9,
    question: 'In a doubly linked list, each node contains:',
    options: [
      'One pointer to the next node',
      'Two pointers — to the next and previous nodes',
      'Three pointers — to next, previous, and parent',
      'No pointers',
    ],
    correctIndex: 1,
  },
  {
    id: 10,
    question: 'Which of the following is NOT a balanced binary search tree?',
    options: ['AVL Tree', 'Red-Black Tree', 'B-Tree', 'Binary Heap'],
    correctIndex: 3,
  },
  {
    id: 11,
    question: 'The amortized time complexity of push and pop operations in a dynamic array is:',
    options: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'],
    correctIndex: 2,
  },
  {
    id: 12,
    question:
      'Which data structure would you use to implement a "undo" functionality in an application?',
    options: ['Queue', 'Stack', 'Priority Queue', 'Deque'],
    correctIndex: 1,
  },
  {
    id: 13,
    question:
      'BFS (Breadth-First Search) uses which data structure internally to track unvisited nodes?',
    options: ['Stack', 'Priority Queue', 'Queue', 'Hash Map'],
    correctIndex: 2,
  },
  {
    id: 14,
    question: 'What is the maximum number of nodes in a binary tree of height h?',
    options: ['h²', '2h', '2^(h+1) - 1', 'h * log h'],
    correctIndex: 2,
  },
  {
    id: 15,
    question:
      'Which sorting algorithm is most efficient when the input array is almost sorted?',
    options: ['Heap Sort', 'Selection Sort', 'Insertion Sort', 'Merge Sort'],
    correctIndex: 2,
  },
  {
    id: 16,
    question: 'In graph theory, a "cycle" refers to a path that:',
    options: [
      'Has no repeated edges',
      'Starts and ends at the same vertex with no repeated vertices (except start/end)',
      'Visits every vertex exactly once',
      'Uses only directed edges',
    ],
    correctIndex: 1,
  },
  {
    id: 17,
    question: 'What is the primary advantage of a trie data structure?',
    options: [
      'O(1) search for any data type',
      'Efficient prefix-based string search',
      'Balanced insertion/deletion',
      'Constant memory usage',
    ],
    correctIndex: 1,
  },
  {
    id: 18,
    question: 'Which of the following is an example of a greedy algorithm?',
    options: [
      'Merge Sort',
      "Floyd-Warshall",
      "Kruskal's Minimum Spanning Tree",
      'Dynamic Programming Fibonacci',
    ],
    correctIndex: 2,
  },
  {
    id: 19,
    question: 'The time complexity of building a max-heap from an unsorted array of n elements is:',
    options: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n²)'],
    correctIndex: 1,
  },
  {
    id: 20,
    question: 'In dynamic programming, memoization refers to:',
    options: [
      'Storing intermediate results to avoid redundant computation',
      'Allocating memory for arrays dynamically',
      'Converting recursion to iteration',
      'Sorting subproblems before solving',
    ],
    correctIndex: 0,
  },
];

export const CODING_QUESTIONS = [
  {
    id: 'code-1',
    type: 'coding',
    title: 'Two Sum Problem',
    difficulty: 'Medium',
    question:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // ProctorTrack™ anti-paste protection active
  // Write your implementation here...
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # ProctorTrack™ anti-paste protection active
    # Write your implementation here...
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // ProctorTrack™ anti-paste protection active
        // Write your implementation here...
        return new int[]{};
    }
}`,
    },
  },
  {
    id: 'code-2',
    type: 'coding',
    title: 'Valid Palindrome String',
    difficulty: 'Easy',
    question:
      'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: 'true',
        explanation: '"amanaplanacanalpanama" is a palindrome.',
      },
      {
        input: 's = "race a car"',
        output: 'false',
        explanation: '"raceacar" is not a palindrome.',
      },
    ],
    constraints: [
      '1 <= s.length <= 2 * 10^5',
      's consists only of printable ASCII characters.',
    ],
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // ProctorTrack™ anti-paste protection active
  // Write your implementation here...
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}`,
      python: `def is_palindrome(s: str) -> bool:
    # ProctorTrack™ anti-paste protection active
    # Write your implementation here...
    clean = [c.lower() for c in s if c.isalnum()]
    return clean == clean[::-1]`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        // ProctorTrack™ anti-paste protection active
        // Write your implementation here...
        return true;
    }
}`,
    },
  },
  {
    id: 'code-3',
    type: 'coding',
    title: 'Reverse Linked List',
    difficulty: 'Medium',
    question:
      'Given the `head` of a singly linked list, reverse the list, and return the reversed list.\n\nCould you implement it both iteratively and recursively?',
    examples: [
      {
        input: 'head = [1, 2, 3, 4, 5]',
        output: '[5, 4, 3, 2, 1]',
      },
      {
        input: 'head = [1, 2]',
        output: '[2, 1]',
      },
    ],
    constraints: [
      'The number of nodes in the list is the range [0, 5000].',
      '-5000 <= Node.val <= 5000',
    ],
    starterCode: {
      javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) { this.val = val; this.next = next; }
 *
 * @param {ListNode} head
 * @return {ListNode}
 */
function reverseList(head) {
  // ProctorTrack™ anti-paste protection active
  // Write your implementation here...
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const nextTemp = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nextTemp;
  }
  return prev;
}`,
      python: `def reverse_list(head):
    # ProctorTrack™ anti-paste protection active
    # Write your implementation here...
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev`,
      java: `class Solution {
    public ListNode reverseList(ListNode head) {
        // ProctorTrack™ anti-paste protection active
        return null;
    }
}`,
    },
  },
];

