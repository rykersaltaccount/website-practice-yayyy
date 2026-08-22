import React, { useContext, useState } from 'react';
import AppContext from '../contexts/AppContext';
import type { Problem } from '../types';
import LinearIssueDetail from '../components/LinearIssueDetail';
import ProblemForm from '../components/ProblemForm';
import ConfirmDialog from '../components/ConfirmDialog';

interface NeetcodePreset {
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  leetCodeUrl: string;
}

const NEETCODE_ROADMAP_CATEGORIES = [
  'All Patterns',
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Linked List',
  'Trees',
  'Tries',
  'Heap / Priority Queue',
  'Backtracking',
  'Graphs',
  'Advanced Graphs',
  '1-D Dynamic Programming',
  '2-D Dynamic Programming',
  'Greedy',
  'Intervals',
  'Math & Geometry',
  'Bit Manipulation',
];

const CURATED_NEETCODE_PRESETS: NeetcodePreset[] = [
  // Arrays & Hashing (9)
  { title: 'Contains Duplicate', category: 'Arrays & Hashing', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/contains-duplicate/' },
  { title: 'Valid Anagram', category: 'Arrays & Hashing', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/valid-anagram/' },
  { title: 'Two Sum', category: 'Arrays & Hashing', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/two-sum/' },
  { title: 'Group Anagrams', category: 'Arrays & Hashing', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/group-anagrams/' },
  { title: 'Top K Frequent Elements', category: 'Arrays & Hashing', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/top-k-frequent-elements/' },
  { title: 'Product of Array Except Self', category: 'Arrays & Hashing', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/product-of-array-except-self/' },
  { title: 'Valid Sudoku', category: 'Arrays & Hashing', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/valid-sudoku/' },
  { title: 'Encode and Decode Strings', category: 'Arrays & Hashing', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/encode-and-decode-strings/' },
  { title: 'Longest Consecutive Sequence', category: 'Arrays & Hashing', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/longest-consecutive-sequence/' },

  // Two Pointers (5)
  { title: 'Valid Palindrome', category: 'Two Pointers', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/valid-palindrome/' },
  { title: 'Two Sum II Input Array Is Sorted', category: 'Two Pointers', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/' },
  { title: '3Sum', category: 'Two Pointers', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/3sum/' },
  { title: 'Container With Most Water', category: 'Two Pointers', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/container-with-most-water/' },
  { title: 'Trapping Rain Water', category: 'Two Pointers', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/trapping-rain-water/' },

  // Sliding Window (6)
  { title: 'Best Time to Buy And Sell Stock', category: 'Sliding Window', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
  { title: 'Longest Substring Without Repeating Characters', category: 'Sliding Window', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
  { title: 'Longest Repeating Character Replacement', category: 'Sliding Window', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
  { title: 'Permutation in String', category: 'Sliding Window', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/permutation-in-string/' },
  { title: 'Minimum Window Substring', category: 'Sliding Window', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/minimum-window-substring/' },
  { title: 'Sliding Window Maximum', category: 'Sliding Window', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/sliding-window-maximum/' },

  // Stack (7)
  { title: 'Valid Parentheses', category: 'Stack', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/valid-parentheses/' },
  { title: 'Min Stack', category: 'Stack', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/min-stack/' },
  { title: 'Evaluate Reverse Polish Notation', category: 'Stack', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/' },
  { title: 'Generate Parentheses', category: 'Stack', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/generate-parentheses/' },
  { title: 'Daily Temperatures', category: 'Stack', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/daily-temperatures/' },
  { title: 'Car Fleet', category: 'Stack', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/car-fleet/' },
  { title: 'Largest Rectangle in Histogram', category: 'Stack', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/largest-rectangle-in-histogram/' },

  // Binary Search (7)
  { title: 'Binary Search', category: 'Binary Search', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/binary-search/' },
  { title: 'Search a 2D Matrix', category: 'Binary Search', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/search-a-2d-matrix/' },
  { title: 'Koko Eating Bananas', category: 'Binary Search', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/koko-eating-bananas/' },
  { title: 'Find Minimum in Rotated Sorted Array', category: 'Binary Search', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
  { title: 'Search in Rotated Sorted Array', category: 'Binary Search', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
  { title: 'Time Based Key-Value Store', category: 'Binary Search', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/time-based-key-value-store/' },
  { title: 'Median of Two Sorted Arrays', category: 'Binary Search', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/median-of-two-sorted-arrays/' },

  // Linked List (11)
  { title: 'Reverse Linked List', category: 'Linked List', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/reverse-linked-list/' },
  { title: 'Merge Two Sorted Lists', category: 'Linked List', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
  { title: 'Reorder List', category: 'Linked List', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/reorder-list/' },
  { title: 'Remove Nth Node From End of List', category: 'Linked List', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/' },
  { title: 'Copy List with Random Pointer', category: 'Linked List', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/copy-list-with-random-pointer/' },
  { title: 'Add Two Numbers', category: 'Linked List', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/add-two-numbers/' },
  { title: 'Linked List Cycle', category: 'Linked List', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/linked-list-cycle/' },
  { title: 'Find the Duplicate Number', category: 'Linked List', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/find-the-duplicate-number/' },
  { title: 'LRU Cache', category: 'Linked List', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/lru-cache/' },
  { title: 'Merge K Sorted Lists', category: 'Linked List', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
  { title: 'Reverse Nodes in k-Group', category: 'Linked List', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/reverse-nodes-in-k-group/' },

  // Trees (15)
  { title: 'Invert Binary Tree', category: 'Trees', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/invert-binary-tree/' },
  { title: 'Maximum Depth of Binary Tree', category: 'Trees', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
  { title: 'Diameter of Binary Tree', category: 'Trees', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/diameter-of-binary-tree/' },
  { title: 'Balanced Binary Tree', category: 'Trees', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/balanced-binary-tree/' },
  { title: 'Same Tree', category: 'Trees', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/same-tree/' },
  { title: 'Subtree of Another Tree', category: 'Trees', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/subtree-of-another-tree/' },
  { title: 'Lowest Common Ancestor of a BST', category: 'Trees', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/' },
  { title: 'Binary Tree Level Order Traversal', category: 'Trees', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
  { title: 'Binary Tree Right Side View', category: 'Trees', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/binary-tree-right-side-view/' },
  { title: 'Count Good Nodes in Binary Tree', category: 'Trees', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/count-good-nodes-in-binary-tree/' },
  { title: 'Validate Binary Search Tree', category: 'Trees', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/validate-binary-search-tree/' },
  { title: 'Kth Smallest Element in a BST', category: 'Trees', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/' },
  { title: 'Construct Binary Tree from Preorder and Inorder Traversal', category: 'Trees', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/' },
  { title: 'Binary Tree Maximum Path Sum', category: 'Trees', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
  { title: 'Serialize and Deserialize Binary Tree', category: 'Trees', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },

  // Tries (3)
  { title: 'Implement Trie (Prefix Tree)', category: 'Tries', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
  { title: 'Design Add and Search Words Data Structure', category: 'Tries', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/' },
  { title: 'Word Search II', category: 'Tries', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/word-search-ii/' },

  // Heap / Priority Queue (7)
  { title: 'Kth Largest Element in a Stream', category: 'Heap / Priority Queue', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/kth-largest-element-in-a-stream/' },
  { title: 'Last Stone Weight', category: 'Heap / Priority Queue', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/last-stone-weight/' },
  { title: 'K Closest Points to Origin', category: 'Heap / Priority Queue', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/k-closest-points-to-origin/' },
  { title: 'Kth Largest Element in an Array', category: 'Heap / Priority Queue', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' },
  { title: 'Task Scheduler', category: 'Heap / Priority Queue', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/task-scheduler/' },
  { title: 'Design Twitter', category: 'Heap / Priority Queue', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/design-twitter/' },
  { title: 'Find Median from Data Stream', category: 'Heap / Priority Queue', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/find-median-from-data-stream/' },

  // Backtracking (9)
  { title: 'Subsets', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/subsets/' },
  { title: 'Combination Sum', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/combination-sum/' },
  { title: 'Permutations', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/permutations/' },
  { title: 'Subsets II', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/subsets-ii/' },
  { title: 'Combination Sum II', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/combination-sum-ii/' },
  { title: 'Word Search', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/word-search/' },
  { title: 'Palindrome Partitioning', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/palindrome-partitioning/' },
  { title: 'Letter Combinations of a Phone Number', category: 'Backtracking', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/' },
  { title: 'N-Queens', category: 'Backtracking', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/n-queens/' },

  // Graphs (13)
  { title: 'Number of Islands', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/number-of-islands/' },
  { title: 'Max Area of Island', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/max-area-of-island/' },
  { title: 'Clone Graph', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/clone-graph/' },
  { title: 'Walls and Gates', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/walls-and-gates/' },
  { title: 'Rotting Oranges', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/rotting-oranges/' },
  { title: 'Pacific Atlantic Water Flow', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/pacific-atlantic-water-flow/' },
  { title: 'Surrounded Regions', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/surrounded-regions/' },
  { title: 'Course Schedule', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/course-schedule/' },
  { title: 'Course Schedule II', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/course-schedule-ii/' },
  { title: 'Graph Valid Tree', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/graph-valid-tree/' },
  { title: 'Number of Connected Components In An Undirected Graph', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/' },
  { title: 'Redundant Connection', category: 'Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/redundant-connection/' },
  { title: 'Word Ladder', category: 'Graphs', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/word-ladder/' },

  // Advanced Graphs (6)
  { title: 'Reconstruct Itinerary', category: 'Advanced Graphs', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/reconstruct-itinerary/' },
  { title: 'Min Cost to Connect All Points', category: 'Advanced Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/min-cost-to-connect-all-points/' },
  { title: 'Network Delay Time', category: 'Advanced Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/network-delay-time/' },
  { title: 'Swim In Rising Water', category: 'Advanced Graphs', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/swim-in-rising-water/' },
  { title: 'Alien Dictionary', category: 'Advanced Graphs', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/alien-dictionary/' },
  { title: 'Cheapest Flights Within K Stops', category: 'Advanced Graphs', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/cheapest-flights-within-k-stops/' },

  // 1-D Dynamic Programming (12)
  { title: 'Climbing Stairs', category: '1-D Dynamic Programming', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/climbing-stairs/' },
  { title: 'Min Cost Climbing Stairs', category: '1-D Dynamic Programming', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/min-cost-climbing-stairs/' },
  { title: 'House Robber', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/house-robber/' },
  { title: 'House Robber II', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/house-robber-ii/' },
  { title: 'Longest Palindromic Substring', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/longest-palindromic-substring/' },
  { title: 'Palindromic Substrings', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/palindromic-substrings/' },
  { title: 'Decode Ways', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/decode-ways/' },
  { title: 'Coin Change', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/coin-change/' },
  { title: 'Maximum Product Subarray', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/maximum-product-subarray/' },
  { title: 'Word Break', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/word-break/' },
  { title: 'Longest Increasing Subsequence', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
  { title: 'Partition Equal Subset Sum', category: '1-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/partition-equal-subset-sum/' },

  // 2-D Dynamic Programming (11)
  { title: 'Unique Paths', category: '2-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/unique-paths/' },
  { title: 'Longest Common Subsequence', category: '2-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/longest-common-subsequence/' },
  { title: 'Best Time to Buy And Sell Stock with Cooldown', category: '2-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/' },
  { title: 'Coin Change II', category: '2-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/coin-change-ii/' },
  { title: 'Target Sum', category: '2-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/target-sum/' },
  { title: 'Interleaving String', category: '2-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/interleaving-string/' },
  { title: 'Longest Increasing Path In a Matrix', category: '2-D Dynamic Programming', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/longest-increasing-path-in-a-matrix/' },
  { title: 'Distinct Subsequences', category: '2-D Dynamic Programming', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/distinct-subsequences/' },
  { title: 'Edit Distance', category: '2-D Dynamic Programming', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/edit-distance/' },
  { title: 'Burst Balloons', category: '2-D Dynamic Programming', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/burst-balloons/' },
  { title: 'Regular Expression Matching', category: '2-D Dynamic Programming', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/regular-expression-matching/' },

  // Greedy (8)
  { title: 'Maximum Subarray', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/maximum-subarray/' },
  { title: 'Jump Game', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/jump-game/' },
  { title: 'Jump Game II', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/jump-game-ii/' },
  { title: 'Gas Station', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/gas-station/' },
  { title: 'Hand of Straights', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/hand-of-straights/' },
  { title: 'Merge Triplets to Form Target Triplet', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/merge-triplets-to-form-target-triplet/' },
  { title: 'Partition Labels', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/partition-labels/' },
  { title: 'Valid Parenthesis String', category: 'Greedy', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/valid-parenthesis-string/' },

  // Intervals (6)
  { title: 'Insert Interval', category: 'Intervals', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/insert-interval/' },
  { title: 'Merge Intervals', category: 'Intervals', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/merge-intervals/' },
  { title: 'Non-Overlapping Intervals', category: 'Intervals', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/non-overlapping-intervals/' },
  { title: 'Meeting Rooms', category: 'Intervals', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/meeting-rooms/' },
  { title: 'Meeting Rooms II', category: 'Intervals', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/meeting-rooms-ii/' },
  { title: 'Minimum Interval to Include Each Query', category: 'Intervals', difficulty: 'Hard', leetCodeUrl: 'https://leetcode.com/problems/minimum-interval-to-include-each-query/' },

  // Math & Geometry (8)
  { title: 'Rotate Image', category: 'Math & Geometry', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/rotate-image/' },
  { title: 'Spiral Matrix', category: 'Math & Geometry', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/spiral-matrix/' },
  { title: 'Set Matrix Zeroes', category: 'Math & Geometry', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/set-matrix-zeroes/' },
  { title: 'Happy Number', category: 'Math & Geometry', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/happy-number/' },
  { title: 'Plus One', category: 'Math & Geometry', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/plus-one/' },
  { title: 'Pow(x, n)', category: 'Math & Geometry', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/powx-n/' },
  { title: 'Multiply Strings', category: 'Math & Geometry', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/multiply-strings/' },
  { title: 'Detect Squares', category: 'Math & Geometry', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/detect-squares/' },

  // Bit Manipulation (7)
  { title: 'Single Number', category: 'Bit Manipulation', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/single-number/' },
  { title: 'Number of 1 Bits', category: 'Bit Manipulation', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/number-of-1-bits/' },
  { title: 'Counting Bits', category: 'Bit Manipulation', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/counting-bits/' },
  { title: 'Reverse Bits', category: 'Bit Manipulation', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/reverse-bits/' },
  { title: 'Missing Number', category: 'Bit Manipulation', difficulty: 'Easy', leetCodeUrl: 'https://leetcode.com/problems/missing-number/' },
  { title: 'Sum of Two Integers', category: 'Bit Manipulation', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/sum-of-two-integers/' },
  { title: 'Reverse Integer', category: 'Bit Manipulation', difficulty: 'Medium', leetCodeUrl: 'https://leetcode.com/problems/reverse-integer/' },
];

const NeetcodePage: React.FC = () => {
  const { problems, addProblem, updateProblem, deleteProblem } = useContext(AppContext)!;
  const [selectedCategory, setSelectedCategory] = useState('All Patterns');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Tracked' | 'Untracked'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [problemToRemove, setProblemToRemove] = useState<Problem | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Map presets to tracked problems if exists
  const combinedItems = CURATED_NEETCODE_PRESETS.map((preset, index) => {
    const matched = problems.find(
      p => p.title.toLowerCase() === preset.title.toLowerCase() || p.leetCodeUrl === preset.leetCodeUrl
    );

    return {
      presetId: `neetcode-${index + 1}`,
      preset,
      problem: matched || null,
      isTracked: !!matched,
    };
  });

  const filteredItems = combinedItems.filter(({ preset, isTracked }) => {
    const matchesCategory = selectedCategory === 'All Patterns' || preset.category === selectedCategory;
    const matchesDifficulty = difficultyFilter === 'All' || preset.difficulty === difficultyFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Tracked' && isTracked) ||
      (statusFilter === 'Untracked' && !isTracked);

    const matchesSearch =
      !searchQuery ||
      preset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesDifficulty && matchesStatus && matchesSearch;
  });

  const totalTrackedCount = combinedItems.filter(item => item.isTracked).length;
  const totalSolvedCount = combinedItems.filter(item => item.problem?.status === 'Done').length;

  const handleStartPractice = (preset: NeetcodePreset) => {
    const newProblem: Omit<Problem, 'id'> = {
      title: preset.title,
      difficulty: preset.difficulty,
      status: 'In Progress',
      priority: 'High',
      assignee: { name: 'you' },
      topics: ['NeetCode 150', preset.category],
      leetCodeUrl: preset.leetCodeUrl,
      initialApproach: 'NeetCode pattern practice started.',
      finalApproach: '',
      solution: '// Enter your solution here\nfunction solve() {\n\n}',
      mistakes: [],
      whatILearned: '',
      dateSolved: new Date().toISOString(),
      reflection: {
        whatWasDifficult: '',
        whatInitiallyThought: '',
        whatMadeItClick: '',
        conceptLearned: preset.category,
        mistakeToAvoid: '',
        confidence: 3,
      },
    };

    addProblem(newProblem);
  };

  const handleQuickMarkDone = (matchedProblem: Problem) => {
    if (matchedProblem.status === 'Done') {
      setProblemToRemove(matchedProblem);
      return;
    }

    updateProblem(matchedProblem.id, { status: 'Done' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Stats Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-0.5 text-xs font-bold font-mono">
              NEETCODE 150
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Curated Interview Roadmap</h1>
          </div>
          <p className="text-xs text-[#8a8f98] mt-1">
            Master core patterns, log reflections & mistakes, and review solutions with AI
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="linear-btn-primary px-4 py-2 text-xs font-semibold"
          >
            + Custom NeetCode Problem
          </button>
        </div>
      </div>

      {/* Progress Metric Card */}
      <div className="linear-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Roadmap Completion</span>
            <span className="font-mono text-[#f59e0b]">
              {totalSolvedCount} / {CURATED_NEETCODE_PRESETS.length} Solved ({totalTrackedCount} in workspace)
            </span>
          </div>
          <span className="font-mono text-xs text-[#8a8f98]">
            {Math.round((totalSolvedCount / CURATED_NEETCODE_PRESETS.length) * 100)}%
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#10b981] transition-all duration-500"
            style={{ width: `${(totalSolvedCount / CURATED_NEETCODE_PRESETS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Pattern Filter Chips & Search */}
      <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0c0d12] p-4">
        {/* Search & Top Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="Search NeetCode problems or patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="linear-input w-full py-1.5 pl-8 pr-3 text-xs"
            />
            <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#62666f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status filter */}
            <div className="flex items-center gap-1">
              {(['All', 'Tracked', 'Untracked'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    statusFilter === tab
                      ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                      : 'text-[#8a8f98] hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-white/[0.1]" />

            {/* Difficulty filter */}
            <div className="flex items-center gap-1">
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    difficultyFilter === diff
                      ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                      : 'text-[#8a8f98] hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
          {NEETCODE_ROADMAP_CATEGORIES.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#5e6ad2] text-white shadow-sm'
                  : 'bg-white/[0.03] text-[#8a8f98] hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c0d12] overflow-hidden">
        <div className="divide-y divide-white/[0.05]">
          {filteredItems.map(({ preset, problem }, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 hover:bg-white/[0.03] transition-colors group select-none"
            >
              {/* Left Side: Status Checkbox + Title + Category */}
              <div className="flex items-center gap-3 min-w-0 pr-4">
                {/* Status Toggle Checkbox */}
                {problem ? (
                  <button
                    type="button"
                    onClick={() => handleQuickMarkDone(problem)}
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                      problem.status === 'Done'
                        ? 'bg-[#10b981] border-[#10b981] text-[#08090a]'
                        : problem.status === 'In Progress'
                        ? 'border-[#f59e0b] bg-[#f59e0b]/20 text-[#f59e0b]'
                        : 'border-white/30 hover:border-white'
                    }`}
                    title={`Status: ${problem.status || 'Todo'}. Click to toggle Done.`}
                  >
                    {problem.status === 'Done' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                    {problem.status === 'In Progress' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartPractice(preset)}
                    className="flex h-4 w-4 items-center justify-center rounded border border-white/30 transition-colors hover:border-white hover:bg-white/[0.06]"
                    title="Add to workspace and start practice"
                    aria-label={`Add ${preset.title} to workspace`}
                  />
                )}

                <span
                  onClick={() => {
                    if (problem) {
                      setSelectedProblem(problem);
                    } else {
                      handleStartPractice(preset);
                    }
                  }}
                  className="text-xs font-semibold text-white tracking-tight truncate cursor-pointer hover:text-[#5e6ad2] transition-colors"
                >
                  {preset.title}
                </span>

                <span className="hidden sm:inline linear-tag text-[10px]">
                  {preset.category}
                </span>
              </div>

              {/* Right Side: Difficulty + Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    preset.difficulty === 'Easy'
                      ? 'text-[#10b981] bg-[#10b981]/10'
                      : preset.difficulty === 'Medium'
                      ? 'text-[#f59e0b] bg-[#f59e0b]/10'
                      : 'text-[#f43f5e] bg-[#f43f5e]/10'
                  }`}
                >
                  {preset.difficulty}
                </span>

                {/* External LeetCode Link */}
                <a
                  href={preset.leetCodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-[#62666f] hover:text-[#5e6ad2] transition-colors"
                  title="LeetCode Problem URL"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
                  </svg>
                </a>

                {/* Workspace Action Button */}
                {problem ? (
                  <button
                    type="button"
                    onClick={() => setSelectedProblem(problem)}
                    className="flex items-center gap-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white px-2.5 py-1 text-xs font-medium transition-colors"
                  >
                    <span>Review</span>
                    <span className="text-[10px] text-[#8a8f98]">→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartPractice(preset)}
                    className="linear-btn-primary px-2.5 py-1 text-xs font-medium"
                  >
                    + Add & Practice
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Linear Issue Detail Inspector Modal */}
      {selectedProblem && (
        <LinearIssueDetail
          problem={selectedProblem}
          allProblems={problems}
          onClose={() => setSelectedProblem(null)}
          onUpdate={(id, updates) => {
            updateProblem(id, updates);
            setSelectedProblem(prev => prev ? { ...prev, ...updates } : null);
          }}
          onDelete={(id) => {
            deleteProblem(id);
            setSelectedProblem(null);
          }}
          onSelectProblem={(p) => setSelectedProblem(p)}
        />
      )}
      {problemToRemove && (
        <ConfirmDialog
          title="Remove Neetcode problem?"
          message={`This will remove “${problemToRemove.title}” from your tracked problems.`}
          confirmLabel="Remove problem"
          onCancel={() => setProblemToRemove(null)}
          onConfirm={() => {
            deleteProblem(problemToRemove.id);
            setProblemToRemove(null);
          }}
        />
      )}

      {/* Custom Add Problem Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">Add Custom NeetCode / Interview Problem</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-[#8a8f98] hover:text-white"
              >
                ✕
              </button>
            </div>
            <ProblemForm
              onSubmit={(data) => {
                addProblem({
                  ...data,
                  topics: Array.from(new Set([...data.topics, 'NeetCode 150'])),
                });
                setShowAddForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NeetcodePage;