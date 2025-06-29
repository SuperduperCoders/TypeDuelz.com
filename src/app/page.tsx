'use client';

import { useEffect, useState, useRef } from 'react';
import { useErrorAudio } from "../hooks/useErrorAudio";

const sentenceBank = {
  easy: [
    "Hi there.",
    "I like cats.",
    "Fast fox.",
    "Hello world.",
    "Nice job!"
  ],
  medium: [
    "The quick brown fox jumps over the lazy dog.",
    "Typing fast is a useful skill.",
    "Tailwind CSS is awesome.",
    "I love coding fun projects.",
    "Next.js makes building web apps easier."
  ],
  hard: [
    "JavaScript developers often face asynchronous challenges.",
    "Efficiency in algorithms can greatly affect performance.",
    "Next.js integrates both frontend and backend logic seamlessly.",
    "Performance optimization is vital for user experience.",
    "Complexity in state management can hinder scalability."
  ]
};

const wpmGoals = {
  easy: 20,
  medium: 40,
  hard: 60,
};

export default function Home() {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [target, setTarget] = useState('');
  const [input, setInput] = useState('');

  const [skill, setSkill] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('typingSkill');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [wpmHistory, setWpmHistory] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wpmHistory');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [feedback, setFeedback] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [isFinished, setIsFinished] = useState(false);

  // User account state
  const [playerName, setPlayerName] = useState("");
  const [password, setPassword] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Track equipped character and skip ability
  const [equippedCharacter, setEquippedCharacter] = useState<string | null>(null);
  const [skipUsed, setSkipUsed] = useState(0); // now a counter
  const maxSkips = equippedCharacter === 'default-typer' ? 1 : 0;

  // Error state for name taken
  const [nameError, setNameError] = useState('');

  // Audio ref for typing sound
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  // Use error audio hook
  const { errorAudioRef, playError } = useErrorAudio();
  // Click sound ref
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  // Duel points state
  const [duelPoints, setDuelPoints] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('duelPoints');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // Track duels since last master typer ability use
  const [masterTyperDuelCount, setMasterTyperDuelCount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('masterTyperDuelCount');
      return saved ? parseInt(saved, 10) : 4; // default to 4 so ability is available on first load
    }
    return 4;
  });

  // Loading state
  const [loading, setLoading] = useState(true);

  // --- THEME PERSISTENCE ON LOAD ---
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     const savedTheme = localStorage.getItem('theme');
  //     if (savedTheme) {
  //       document.documentElement.classList.remove('light', 'dark');
  //       document.documentElement.classList.add(savedTheme);
  //     }
  //   }
  // }, []);

  useEffect(() => {
    generateSentence();
  }, [difficulty]);

  useEffect(() => {
    // When target sentence is set, we consider loading done
    if (target) setLoading(false);
  }, [target]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('typingSkill', skill.toString());
    }
  }, [skill]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wpmHistory', JSON.stringify(wpmHistory));
    }
  }, [wpmHistory]);

  // On mount, check for saved player info and theme
  useEffect(() => {
    const savedName = localStorage.getItem("playerName");
    const savedPass = localStorage.getItem("playerPassword");
    if (!savedName || !savedPass) {
      setShowAccountModal(true);
    } else {
      setPlayerName(savedName);
      setPassword(savedPass);
    }
    // Load skill and wpmHistory if not already loaded (for SSR safety)
    if (typeof window !== 'undefined') {
      const savedSkill = localStorage.getItem('typingSkill');
      if (savedSkill) setSkill(parseInt(savedSkill, 10));
      const savedWpmHistory = localStorage.getItem('wpmHistory');
      if (savedWpmHistory) setWpmHistory(JSON.parse(savedWpmHistory));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEquippedCharacter(localStorage.getItem('equippedCharacter'));
    }
  }, []);

  // Reset skipUsed on new sentence
  useEffect(() => {
    setSkipUsed(0);
  }, [target]);

  // Save duel points to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('duelPoints', duelPoints.toString());
    }
  }, [duelPoints]);

  // Persist masterTyperDuelCount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('masterTyperDuelCount', masterTyperDuelCount.toString());
    }
  }, [masterTyperDuelCount]);

  // Helper to determine if we're in duel mode
  const isDuelMode = typeof window !== 'undefined' && window.location.pathname === '/duel';

  // Modified generateSentence for Pro Typer in duel mode
  const generateSentence = () => {
    // setLoading(true); // show loading while choosing sentence

    let chosenDifficulty = difficulty;
    // Pro Typer ability: 50% chance of easier sentence in duel mode
    if (
      isDuelMode &&
      equippedCharacter === 'pro' &&
      Math.random() < 0.5 &&
      (difficulty === 'medium' || difficulty === 'hard')
    ) {
      chosenDifficulty = difficulty === 'hard' ? 'medium' : 'easy';
    }

    const sentenceList = sentenceBank[chosenDifficulty];
    const random = sentenceList[Math.floor(Math.random() * sentenceList.length)];
    setTarget(random);
    setInput('');
    setFeedback('');
    setWpm(null);
    setAccuracy(100);
    setStartTime(Date.now());
    setIsFinished(false);
  };

  // Fix accuracy calculation to ignore trailing spaces
  const calculateAccuracy = (typed: string, correct: string) => {
    let correctCount = 0;
    let checkedLength = Math.min(typed.length, correct.length);
    for (let i = 0; i < checkedLength; i++) {
      if (typed[i] === correct[i]) correctCount++;
    }
    // Only count up to the last non-space character in typed
    let lastCharIdx = typed.trimEnd().length;
    return lastCharIdx > 0 ? Math.round((correctCount / lastCharIdx) * 100) : 100;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return; // block input after finish

    const newVal = e.target.value;

    // Prevent going backwards
    if (newVal.length < input.length) return;
    // Prevent skipping chars
    if (newVal.length > input.length + 1) return;

    // SOLO MODE: Only allow typing the next character if it matches the target
    if (!isDuelMode && newVal.length > 0) {
      // Check all previous letters
      for (let i = 0; i < newVal.length - 1; i++) {
        if (newVal[i] !== target[i]) {
          playError();
          return;
        }
      }
      // Block if the new letter is not correct
      if (newVal[newVal.length - 1] !== target[newVal.length - 1]) {
        playError();
        return;
      }
    }

    setInput(newVal);

    // Play typing sound in both solo and duel mode (force play by pausing and setting currentTime)
    if (typingAudioRef.current) {
      typingAudioRef.current.pause();
      typingAudioRef.current.currentTime = 0;
      typingAudioRef.current.play().catch((e) => {
        console.log('Typing audio play failed:', e);
      });
    }

    const liveAccuracy = calculateAccuracy(newVal, target);
    setAccuracy(liveAccuracy);

    if (newVal.length === target.length) {
      setIsFinished(true);

      const endTime = Date.now();
      const durationInMinutes = (endTime - (startTime ?? endTime)) / 60000;
      const wordCount = target.trim().split(/\s+/).length;
      const calculatedWpm = Math.round(wordCount / durationInMinutes);

      setWpm(calculatedWpm);
      setSkill(prev => prev + 1);
      setWpmHistory(prev => [...prev, calculatedWpm]);

      // In solo mode, just show accuracy feedback, not 'You win!'
      setFeedback(`✅ Submitted! Accuracy: ${liveAccuracy}%`);

      setTimeout(() => {
        setFeedback("");
        window.location.href = "/";
      }, 3000);
    }
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    if (playerName && password) {
      // Unique name logic
      let registeredNames: string[] = [];
      if (typeof window !== 'undefined') {
        const namesRaw = localStorage.getItem('registeredNames');
        if (namesRaw) registeredNames = JSON.parse(namesRaw);
        // If editing, allow keeping your own name
        const currentName = localStorage.getItem('playerName');
        const isNameTaken = registeredNames.includes(playerName) && playerName !== currentName;
        if (isNameTaken) {
          setNameError(`The name "${playerName}" is already taken.`);
          return;
        }
        // Remove old name if changed
        if (currentName && currentName !== playerName) {
          registeredNames = registeredNames.filter(n => n !== currentName);
        }
        // Add new name if not present
        if (!registeredNames.includes(playerName)) {
          registeredNames.push(playerName);
        }
        localStorage.setItem('registeredNames', JSON.stringify(registeredNames));
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerPassword', password);
        setShowAccountModal(false);
      }
    }
  };

  const handleEditAccount = () => {
    setShowAccountModal(true);
  };

  // const topWpm = wpmHistory.length > 0 ? Math.max(...wpmHistory) : 0;
  // const averageWpm =
  //   wpmHistory.length > 0
  //     ? Math.round(wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length)
  //     : 0;

  const currentGoal = wpmGoals[difficulty];

  const progressPercent = wpm && currentGoal ? Math.min((wpm / currentGoal) * 100, 100) : 0;

  const goalMet = wpm !== null && wpm >= currentGoal;
  const wpmColorClass = goalMet ? 'text-green-600' : 'text-red-600';
  const progressBarColor = goalMet ? 'bg-green-600' : 'bg-red-600';

  const renderHighlightedTarget = () => {
    return (
      <p className="font-mono text-lg flex flex-wrap">
        {target.split('').map((char, idx) => {
          let className = 'px-0.5';
          const currentChar = input[idx];

          if (char === ' ') {
            char = '␣';
            className += ' bg-gray-300 rounded';
          }

          if (idx < input.length) {
            className +=
              currentChar === target[idx]
                ? ' text-green-600'
                : ' text-red-600 bg-red-100';
          } else if (idx === input.length) {
            className += ' bg-yellow-200 text-black rounded';
          } else {
            className += ' text-gray-500';
          }

          return (
            <span key={idx} className={className}>
              {char}
            </span>
          );
        })}
      </p>
    );
  };

  // Play click sound
  const playClick = () => {
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play();
    }
  };

  // Unlock typing audio on first user interaction (for autoplay policy, improved reliability)
  useEffect(() => {
    let unlocked = false;
    const unlockAudio = () => {
      if (!unlocked && typingAudioRef.current) {
        typingAudioRef.current.load();
        typingAudioRef.current.play().then(() => {
          typingAudioRef.current?.pause();
          typingAudioRef.current!.currentTime = 0;
          unlocked = true;
          console.log('Typing audio unlocked');
        }).catch((e) => {
          unlocked = true;
          console.log('Typing audio unlock failed:', e);
        });
      }
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
    };
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);
    return () => {
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
    };
  }, []);

  // Main UI when loaded
  return (
    <main className="relative min-h-screen flex flex-col items-stretch bg-gradient-to-br from-white to-slate-100 p-0">
      {/* Click and typing audio */}
      <audio ref={typingAudioRef} src="/typing.mp3" preload="auto" />
      <audio ref={errorAudioRef} src="/error.mp3" preload="auto" />
      <audio ref={clickAudioRef} src="/click.mp3" preload="auto" />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-white text-3xl font-bold animate-pulse">Loading...</div>
        </div>
      )}

      {/* Top navigation buttons - stick to top */}
      <div className="fixed top-0 left-0 w-full flex flex-row justify-end gap-2 p-4 bg-white/80 z-50 shadow-md">
        <button
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold border border-gray-400 hover:bg-blue-500 hover:text-white transition"
          onClick={() => { playClick(); window.location.href = '/duel'; }}
        >
          Duel Mode
        </button>
        <button
          className="bg-yellow-400 text-black px-3 py-1 rounded-md font-semibold border border-yellow-600 hover:bg-yellow-500 transition"
          onClick={() => { playClick(); handleEditAccount(); }}
        >
          Edit Account
        </button>
        <button
          className="bg-purple-500 text-white px-4 py-2 rounded-md font-semibold border border-purple-700 hover:bg-purple-600 transition"
          onClick={() => { playClick(); window.location.href = '/characters'; }}
        >
          Characters
        </button>
        <button
          className="bg-gray-900 text-white px-4 py-2 rounded-md font-semibold border border-gray-900 hover:bg-gray-700 transition"
          onClick={() => { playClick(); window.location.href = '/settings'; }}
        >
          Settings
        </button>
      </div>
      <div className="h-20" /> {/* Spacer for fixed nav */}

      {/* Duel Points Display */}
      <div className="fixed top-4 left-4 z-50 bg-white/90 border border-gray-300 rounded-xl px-5 py-3 shadow-lg text-left">
        <div className="text-xs text-gray-500 font-semibold mb-1">Duel Points</div>
        <div className="text-lg font-bold text-purple-700">{duelPoints}</div>
      </div>

      {/* Difficulty Panel */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex gap-2 bg-gray-200 rounded-lg p-2 shadow">
          <button
            className={`px-4 py-2 rounded-md font-semibold transition ${
              difficulty === 'easy'
                ? 'bg-green-400 text-white shadow'
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => { playClick(); setDifficulty('easy'); }}
          >
            Easy
          </button>
          <button
            className={`px-4 py-2 rounded-md font-semibold transition ${
              difficulty === 'medium'
                ? 'bg-yellow-400 text-white shadow'
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => { playClick(); setDifficulty('medium'); }}
          >
            Medium
          </button>
          <button
            className={`px-4 py-2 rounded-md font-semibold transition ${
              difficulty === 'hard'
                ? 'bg-red-500 text-white shadow'
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => { playClick(); setDifficulty('hard'); }}
          >
            Hard
          </button>
        </div>
      </div>

      <h1 className="text-5xl font-extrabold mb-6 text-center tracking-wide select-none">
        <span className="block text-black drop-shadow-lg animate-pulse">
          TYPE
        </span>
        <span className="block text-4xl font-extrabold mt-[-0.5rem] ml-32 text-red-600 drop-shadow-lg animate-pulse tracking-wider">
          DUELZ
        </span>
        <span className="block text-base font-normal text-gray-500 mt-2">{playerName && `(Player: ${playerName})`}</span>
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-lg max-w-xl w-full mt-24 mx-auto">
        <p className="mb-2 text-lg text-gray-700">Type this sentence:</p>
        <div className="mb-4 bg-blue-100 p-3 rounded-md text-wrap break-words">
          {renderHighlightedTarget()}
        </div>

        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={e => {
            if (
              equippedCharacter === 'default-typer' &&
              e.key === 'Enter' &&
              skipUsed < maxSkips &&
              !isFinished
            ) {
              // Only allow skip if at a space or the current character is correct
              const currentIdx = input.length;
              if (target[currentIdx] !== ' ' && input[currentIdx] !== target[currentIdx]) {
                // Block skip if not at a space and not correct
                e.preventDefault();
                return;
              }
              // Find the next space after the current input
              const nextSpace = target.indexOf(' ', input.length);
              let newInput = input;
              if (nextSpace !== -1 && nextSpace > input.length) {
                // Add spaces up to the next space, but don't add extra if already at space
                const toAdd = target.slice(input.length, nextSpace + 1).replace(/[^ ]/g, '');
                newInput += toAdd;
              } else if (nextSpace === -1 && input.length < target.length) {
                // At the end, add spaces up to the end if any
                const toAdd = target.slice(input.length).replace(/[^ ]/g, '');
                newInput += toAdd;
              }
              setInput(newInput);
              setSkipUsed(skipUsed + 1);
              e.preventDefault();
            }
          }}
          className="w-full p-3 border rounded-md text-black"
          placeholder="Start typing..."
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          disabled={isFinished}
        />

        {feedback && (
          <p className="mt-3 text-lg font-semibold text-green-600 animate-bounce">{feedback}</p>
        )}

        {wpm !== null ? (
          <>
            <div className={`mt-3 text-sm ${goalMet ? 'text-green-600' : 'text-red-600'}`}>
              🕐 WPM: <span className="font-bold">{wpm}</span><br />
              🎯 Accuracy: <span className="font-bold">{accuracy}</span>%
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-300 h-3 rounded-full mt-2 overflow-hidden">
              <div
                className={`${goalMet ? 'bg-green-600' : 'bg-red-600'} h-full transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        ) : (
          // Show live accuracy while typing before completion
          <div className="mt-3 text-sm text-gray-700">
            🎯 Accuracy: <span className="font-bold">{accuracy}</span>%
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            🧠 Skill Level: <span className="font-bold">{skill}</span>
          </p>
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <form onSubmit={handleAccountSubmit} className="bg-white p-8 rounded-2xl shadow-lg flex flex-col gap-4 min-w-[320px]">
            <h2 className="text-2xl font-bold mb-2 text-center">{playerName ? "Edit Account" : "Create Account"}</h2>
            <input
              type="text"
              placeholder="Player Name"
              value={playerName}
              onChange={e => { setPlayerName(e.target.value); setNameError(''); }}
              className="p-3 border rounded-md text-black"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="p-3 border rounded-md text-black"
              required
            />
            {nameError && <div className="text-red-600 text-sm font-semibold">{nameError}</div>}
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md font-semibold mt-2 hover:bg-blue-600 transition" onClick={playClick}>Save</button>
          </form>
        </div>
      )}

      {/* Average Accuracy Floating Corner */}
      <div className="fixed bottom-4 right-4 z-50 bg-white/90 border border-gray-300 rounded-xl px-5 py-3 shadow-lg text-right">
        <div className="text-xs text-gray-500 font-semibold mb-1">Avg. Accuracy</div>
        <div className="text-lg font-bold text-blue-700">
          {/* Since only the latest accuracy is tracked, show average of all completed rounds as 100% for now, or N/A if none */}
          {wpmHistory.length > 0 ? `${Math.round(accuracy)}%` : 'N/A'}
        </div>
      </div>
    </main>
  );
}
