import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Zap,
  Utensils,
  Weight as WeightIcon,
  Sword,
  Users,
  Brain,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Play,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Coins,
  Scale,
  Volume2,
  VolumeX,
  Square,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import Markdown from 'react-markdown';
import { GameState, World, Difficulty, Goal, Stats } from './types';
import { generateNextTurn } from './services/geminiService';
import SessionTimer from './components/SessionTimer';

const VFXOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: 75 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-amber-400/30 blur-[2px]"
          initial={{
            left: `${Math.random() * 100}%`,
            top: '110%',
            opacity: 0,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            top: '-10%',
            opacity: [0, 1, 0],
            x: [0, Math.random() * 100 - 50, 0],
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10,
          }}
        />
      ))}
    </div>
  );
};

// Function to get image filename based on world
const getWorldImage = (world: World): string => {
  const worldToImage: Record<World, string> = {
    'The Wayside Inn': '/txtadv/images/Wayside Inn.png',
    'The Borderland Ruin': '/txtadv/images/Borderland Ruin.png',
    'The Whispering Hallow': '/txtadv/images/Whispering Hallow.png',
  };
  return worldToImage[world] || '/txtadv/images/Wayside Inn.png';
};

const INITIAL_STATS: Stats = {
  hp: 100,
  skill: 0,
  special: 0,
  hunger: 100,
  weight: 0,
  maxWeight: 100,
  alignment: 0,
  int: 10,
  str: 10,
  lumes: 5,
  silver: 100
};

const STARTING_STORIES: Record<World, { story: string; choices: { text: string; action: string }[]; vocabulary: any[] }> = {
  'The Wayside Inn': {
    story: `The rain **lashes** (猛烈拍打) against the timbered walls of the inn, a lonely **sanctuary** (避難所) perched where the Great East Road meets the climbing foothills. Inside, the air is thick with the smell of wet wool, pipeweed, and roasting mutton. You sit in a corner **shadowed** (被陰影籠罩的) by a low-hanging beam, watching the diverse folk of Middle-earth huddle around the hearth. The firelight **flickers** (閃爍) off the faces of nervous merchants and stone-faced rangers. Conversations are **hushed** (安靜的/小聲的), but one name rises above the crackle of the logs: the Star-Glass. They say a peddler found a sliver of it in the mud of the North Downs, and now, agents of both the White City and the Shadowed Land are **scouring** (搜查/搜尋) every cellar from here to the sea. The door creaks open, letting in a swirl of mist and a hooded figure who scans the room with eyes that seem to see through the **gloom** (幽暗/陰暗). You feel the weight of your travel-worn gear; the road has brought you here, but the hunt begins tonight. Whether you seek to protect the Shard or claim its power for your own, the peace of the inn is a fragile mask.`,
    choices: [
      { text: "Approach the hooded newcomer to gauge their intentions before they spot you. / 在被發現前接近那名兜帽客以衡量其意圖。", action: "Approach the hooded newcomer" },
      { text: "Eavesdrop on the merchants by the fire to learn the Shard’s last known location. / 偷聽火堆旁商人的談話以得知碎片最後出現的地點。", action: "Eavesdrop on the merchants" },
      { text: "Slip out the back door into the rain to check if you are being followed. / 從後門溜入雨中檢查是否有人跟蹤。", action: "Slip out the back door" },
      { text: "Loosen your weapon in its sheath and keep a watchful eye on the room’s exits. / 鬆開劍鞘中的武器，警惕地注視房間出口。", action: "Loosen weapon and watch exits" },
      { text: "Call the innkeeper over to ask about any \"unusual travelers\" who passed through recently. / 叫店主過來詢問最近是否有「不尋常的旅人」經過。", action: "Ask innkeeper about travelers" }
    ],
    vocabulary: [
      { word: "Lashes", translation: "猛烈拍打", example: "The rain lashes against the window.", exampleTranslation: "雨水猛烈拍打著窗戶。" },
      { word: "Sanctuary", translation: "避難所", example: "The church provided a sanctuary for the refugees.", exampleTranslation: "教堂為難民提供了避難所。" },
      { word: "Shadowed", translation: "被陰影籠罩的", example: "He sat in a shadowed corner of the room.", exampleTranslation: "他坐在房間裡一個被陰影籠罩的角落。" },
      { word: "Flickers", translation: "閃爍", example: "The candle flame flickers in the breeze.", exampleTranslation: "燭火在微風中閃爍。" },
      { word: "Hushed", translation: "安靜的/小聲的", example: "They spoke in hushed tones so as not to wake the baby.", exampleTranslation: "他們小聲說話，以免吵醒嬰兒。" },
      { word: "Scouring", translation: "搜查/搜尋", example: "Police are scouring the area for clues.", exampleTranslation: "警方正在該地區搜查線索。" },
      { word: "Gloom", translation: "幽暗/陰暗", example: "He peered into the gloom of the cave.", exampleTranslation: "他凝視著洞穴的幽暗處。" },
      { word: "Gauge", translation: "衡量/判斷", example: "It's difficult to gauge his reaction.", exampleTranslation: "很難判斷他的反應。" },
      { word: "Eavesdrop", translation: "偷聽", example: "She tried to eavesdrop on their conversation.", exampleTranslation: "她試圖偷聽他們的談話。" },
      { word: "Fragile", translation: "脆弱的", example: "The peace agreement is very fragile.", exampleTranslation: "和平協議非常脆弱。" }
    ]
  },
  'The Borderland Ruin': {
    story: `Sunlight **filters** (過濾/滲透) through the cracked marble ribs of a forgotten watchtower, once a proud **sentinel** (哨兵) of a kingdom long turned to dust. You have taken shelter here among the ivy and the tumbled **masonry** (石造建築). Below, the valley stretches out—a **patchwork** (拼湊物) of golden fields and **encroaching** (侵蝕/蠶食) briars. This was once a land of law, but now it is a graveyard of ambitions. While **scavenging** (搜尋/拾荒) for dry wood, you noticed fresh markings carved into the weathered stone: a **sigil** (符號/印記) of the Star-Glass. The rumors were true; the artifact’s path crossed these ruins. The silence of the morning is broken by the distant **clatter** (喀噠聲) of iron on stone—a patrol is approaching the base of the tower. They don’t fly a scout’s banner, and their silent, **disciplined** (紀律嚴明的) march suggests they aren't here for a simple patrol. They are searching for the same light you are. You stand amidst the bones of the past, realizing that the "Classic Quest" isn't just a story told by bards—it is a cold wind blowing through these very arches.`,
    choices: [
      { text: "Climb to the highest point of the ruin to scout the size of the approaching party. / 爬到遺跡最高點偵察接近隊伍的人數。", action: "Climb to the highest point" },
      { text: "Scour the rubble for the hidden cache mentioned in the stone-carved sigils. / 在碎石中搜尋石刻符號提到的隱藏儲藏處。", action: "Scour the rubble" },
      { text: "Set a simple tripwire trap in the narrow stairway to slow down any intruders. / 在狹窄樓梯設置簡單的絆線陷阱以減慢入侵者。", action: "Set a tripwire trap" },
      { text: "Hide in the deep shadows of the cellar and wait for the patrol to pass. / 躲在地下室的深影中等待巡邏隊經過。", action: "Hide in the cellar" },
      { text: "Signal the patrol from the battlements to see if they are allies or enemies. / 從城垛向巡邏隊發信號，看看他們是盟友還是敵人。", action: "Signal the patrol" }
    ],
    vocabulary: [
      { word: "Filters", translation: "過濾/滲透", example: "Light filters through the leaves.", exampleTranslation: "光線透過葉子滲透進來。" },
      { word: "Sentinel", translation: "哨兵", example: "The tower stood like a lonely sentinel.", exampleTranslation: "塔樓像一個孤獨的哨兵一樣矗立著。" },
      { word: "Masonry", translation: "石造建築", example: "The ancient masonry was covered in moss.", exampleTranslation: "古老的石造建築上覆蓋著苔蘚。" },
      { word: "Patchwork", translation: "拼湊物", example: "The fields looked like a patchwork quilt.", exampleTranslation: "田野看起來像一床拼布被子。" },
      { word: "Encroaching", translation: "侵蝕/蠶食", example: "The encroaching desert is a major problem.", exampleTranslation: "不斷蠶食的沙漠是一個主要問題。" },
      { word: "Scavenging", translation: "搜尋/拾荒", example: "Animals were scavenging for food in the trash.", exampleTranslation: "動物在垃圾中搜尋食物。" },
      { word: "Sigil", translation: "符號/印記", example: "The wizard carved a mysterious sigil on the door.", exampleTranslation: "巫師在門上刻了一個神秘的符號。" },
      { word: "Clatter", translation: "喀噠聲", example: "The clatter of horses' hooves echoed in the street.", exampleTranslation: "馬蹄的喀噠聲在街道上迴盪。" },
      { word: "Disciplined", translation: "紀律嚴明的", example: "The soldiers were highly disciplined.", exampleTranslation: "士兵們紀律嚴明。" },
      { word: "Battlements", translation: "城垛", example: "Archers stood behind the battlements.", exampleTranslation: "弓箭手站在城垛後面。" }
    ]
  },
  'The Whispering Hallow': {
    story: `The air in the Hallow is **unnaturally** (不自然地) still, thick with the scent of crushed mint and ancient earth. Huge, **gnarled** (多節的/粗糙的) oaks weave their branches into a living **cathedral** (大教堂) overhead, **dampening** (減弱/抑制) the sound of the outside world. This is a place of old power, neutral and **indifferent** (漠不關心的) to the **squabbles** (爭吵) of men and orcs. At the center of the grove stands a **sun-bleached** (曬白的) altar, its surface etched with constellations that no longer match the night sky. Legend claims the Star-Glass was forged from the tears of the stars themselves, and the Hallow remembers its birth. As you stand before the altar, the ground beneath your boots vibrates with a low, rhythmic **thrum** (低沉的嗡嗡聲). A single crow perches on a low branch, tilting its head as if judging your worth. The peace is **deceptive** (欺騙性的); you feel a **prickle** (刺痛感) on the back of your neck. You are being watched, not by soldiers, but by the forest itself. The quest has led you to the heart of the mystery, and the path forward requires a steady hand and a keen eye.`,
    choices: [
      { text: "Inspect the ancient altar for any mechanism or hidden compartment. / 檢查古老祭壇是否有機關或隱藏隔層。", action: "Inspect the altar" },
      { text: "Track the source of the vibration by pressing your ear to the mossy ground. / 將耳朵貼在苔蘚覆蓋的地面上追蹤震動源。", action: "Track the vibration" },
      { text: "Follow the flight of the crow, suspecting it may lead to a hidden path. / 跟隨烏鴉的飛行，懷疑它可能引向隱藏路徑。", action: "Follow the crow" },
      { text: "Gather your belongings and prepare to defend yourself against the unseen watcher. / 收拾行囊，準備防禦看不見的監視者。", action: "Prepare for defense" },
      { text: "Search the surrounding treeline for signs of recent footprints or disturbed earth. / 搜尋周圍樹林是否有最近的腳印或被翻動過的土地。", action: "Search treeline" }
    ],
    vocabulary: [
      { word: "Unnaturally", translation: "不自然地", example: "The room was unnaturally quiet.", exampleTranslation: "房間安靜得不自然。" },
      { word: "Gnarled", translation: "多節的/粗糙的", example: "The old man had gnarled hands.", exampleTranslation: "老人的手布滿老繭且多節。" },
      { word: "Cathedral", translation: "大教堂", example: "The trees formed a natural cathedral.", exampleTranslation: "樹木形成了一個天然的大教堂。" },
      { word: "Dampening", translation: "減弱/抑制", example: "The snow was dampening the sounds of the city.", exampleTranslation: "雪抑制了城市的聲音。" },
      { word: "Indifferent", translation: "漠不關心的", example: "Nature is indifferent to human suffering.", exampleTranslation: "大自然對人類的痛苦漠不關心。" },
      { word: "Squabbles", translation: "爭吵", example: "They had a minor squabble over money.", exampleTranslation: "他們為了錢發生了一點小爭吵。" },
      { word: "Sun-bleached", translation: "曬白的", example: "The bones were sun-bleached and brittle.", exampleTranslation: "骨頭被曬得發白且脆弱。" },
      { word: "Thrum", translation: "低沉的嗡嗡聲", example: "The engine made a steady thrum.", exampleTranslation: "引擎發出穩定的嗡嗡聲。" },
      { word: "Deceptive", translation: "欺騙性的", example: "Appearances can be deceptive.", exampleTranslation: "外表可能是具有欺騙性的。" },
      { word: "Prickle", translation: "刺痛感", example: "He felt a prickle of fear.", exampleTranslation: "他感到一陣恐懼的刺痛。" }
    ]
  }
};

function TypewriterMarkdown({ text, onComplete }: { text: string, onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setSkipped(false);
  }, [text]);

  useEffect(() => {
    if (skipped) {
      onComplete();
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 15);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [currentIndex, text, skipped, onComplete]);

  const displayedText = skipped ? text : text.substring(0, currentIndex);

  return (
    <div onClick={() => setSkipped(true)} className="cursor-pointer" title="Click to skip typing">
      <Markdown>{displayedText}</Markdown>
    </div>
  );
}

export default function App() {
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('eti_jwt_token'));
  const [state, setState] = useState<GameState>({
    phase: 'INITIALIZATION',
    playerName: '',
    gender: 'Male',
    race: 'Human',
    occupation: 'Warrior',
    world: 'The Wayside Inn',
    difficulty: 1,
    goal: 'Defeat your Enemy',
    stats: INITIAL_STATS,
    weapon: 'None',
    companion: 'None',
    skillName: 'Basic Melee',
    specialName: 'None',
    history: [],
    currentStory: '',
    currentImagePrompt: '',
    vocabulary: [],
    grammar: null,
    choices: [],
    loading: false,
  });

  const [image, setImage] = useState<string | null>(null);
  const [showLab, setShowLab] = useState(false);
  const [customAction, setCustomAction] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Authentication check on app load
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const token = localStorage.getItem('eti_jwt_token');

        if (!token) {
          console.log('No authentication token found');
          window.location.href = 'https://portal.eti.com.hk/landing/';
          return;
        }

        // Validate token with auth API
        const response = await fetch('https://auth.eti.com.hk/api/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.log('Token validation failed:', response.status);
          localStorage.removeItem('eti_jwt_token');
          window.location.href = 'https://portal.eti.com.hk/landing/';
          return;
        }

        const data = await response.json();

        console.log('Authentication successful');
        setIsAuthenticating(false);

      } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = 'https://portal.eti.com.hk/landing/';
      }
    };

    checkAuthentication();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('https://auth.eti.com.hk/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }
    localStorage.removeItem('eti_jwt_token');
    window.location.href = 'https://portal.eti.com.hk/landing/';
  };

  const handleTypingComplete = useCallback(() => {
    setIsTyping(false);
  }, []);

  const handleStart = async () => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      // Use the pre-written starting story based on the selected world
      const startingData = STARTING_STORIES[state.world];

      // Transition to adventure phase immediately with pre-written story
      setState(prev => ({
        ...prev,
        phase: 'ADVENTURE',
        currentStory: startingData.story,
        currentImagePrompt: `A detailed fantasy scene of ${prev.world} with a ${prev.race} ${prev.occupation}`,
        vocabulary: startingData.vocabulary,
        grammar: { structure: "Present Simple for setting scenes", explanation: "Used to describe ongoing states or habitual actions in a story.", example: "The rain lashes against the walls." },
        choices: startingData.choices,
        loading: false,
        history: [startingData.story],
        weapon: prev.weapon,
        companion: prev.companion
      }));
      setIsTyping(true);

      // Set static image based on selected world
      setImage(getWorldImage(state.world));

    } catch (error) {
      console.error("Game start failed:", error);
      setState(prev => ({ ...prev, loading: false, error: "Failed to initialize story. Please try again." }));
    }
  };

  const handleChoice = async (choice: { text: string; action: string; isCustom?: boolean }) => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const result = await generateNextTurn(state, choice.action);

      // Update stats
      const newStats = { ...state.stats };
      if (choice.isCustom) {
        newStats.lumes = Math.max(0, newStats.lumes - 1);
      }

      if (result.statChanges) {
        Object.keys(result.statChanges).forEach(key => {
          const k = key as keyof Stats;
          if (typeof newStats[k] === 'number') {
            let maxVal = 100;
            if (k === 'lumes') maxVal = 999;
            if (k === 'silver') maxVal = 99999;
            if (k === 'maxWeight') maxVal = 999;
            if (k === 'weight') maxVal = newStats.maxWeight;

            (newStats[k] as number) = Math.min(maxVal, Math.max(0, (newStats[k] as number) + (result.statChanges[k] || 0)));
          }
        });
      }

      // Hunger logic: if AI didn't provide a hunger change, drop by 1 as baseline
      if (!result.statChanges || result.statChanges.hunger === undefined || result.statChanges.hunger === 0) {
        newStats.hunger = Math.max(0, newStats.hunger - 1);
      }

      if (newStats.hunger === 0) {
        newStats.hp = Math.max(0, newStats.hp - 1);
      }

      const isGameOver = newStats.hp <= 0;

      setState(prev => ({
        ...prev,
        phase: isGameOver ? 'GAME_OVER' : 'ADVENTURE',
        stats: newStats,
        currentStory: result.story,
        currentImagePrompt: result.imagePrompt,
        vocabulary: result.vocabulary,
        grammar: result.grammar,
        choices: result.choices,
        loading: false,
        history: [...prev.history, result.story],
        weapon: result.newWeapon || prev.weapon,
        companion: result.newCompanion || prev.companion,
        skillName: result.newSkillName || prev.skillName,
        specialName: result.newSpecialName || prev.specialName
      }));
      setIsTyping(true);
      setShowLab(false);
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, loading: false, error: "Failed to generate next turn. Please try again." }));
    }
  };

  const renderInitialization = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto p-8 bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border-2 border-amber-700/50 relative overflow-hidden"
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-500/50 rounded-tl-xl"></div>
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-500/50 rounded-tr-xl"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-500/50 rounded-bl-xl"></div>
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-amber-500/50 rounded-br-xl"></div>



      <h1 className="text-5xl font-serif font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 drop-shadow-sm">
        English of Might and Magic
      </h1>
      <p className="text-center text-amber-200/60 font-serif italic mb-8">Forge your destiny, master the language.</p>

      <div className="space-y-6 relative z-10">
        <div className="bg-slate-800/50 p-6 rounded-lg border border-amber-900/30">
          <label className="block text-sm font-serif text-amber-300 mb-2 uppercase tracking-wider">Hero's Name</label>
          <input
            type="text"
            value={state.playerName}
            onChange={e => setState(s => ({ ...s, playerName: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-950/80 text-amber-100 rounded border border-amber-700/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-serif text-lg placeholder:text-slate-600"
            placeholder="Enter your name..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-amber-900/30">
            <label className="block text-xs font-serif text-amber-300 mb-2 uppercase tracking-wider">Gender</label>
            <select
              value={state.gender}
              onChange={e => setState(s => ({ ...s, gender: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950/80 text-amber-100 rounded border border-amber-700/50 focus:border-amber-400 outline-none font-serif"
            >
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-amber-900/30">
            <label className="block text-xs font-serif text-amber-300 mb-2 uppercase tracking-wider">Race</label>
            <select
              value={state.race}
              onChange={e => setState(s => ({ ...s, race: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950/80 text-amber-100 rounded border border-amber-700/50 focus:border-amber-400 outline-none font-serif"
            >
              <option>Human</option>
              <option>Elf</option>
              <option>High Elf</option>
              <option>Dwarf</option>
              <option>Orc</option>
              <option>Halfling</option>
            </select>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-amber-900/30">
            <label className="block text-xs font-serif text-amber-300 mb-2 uppercase tracking-wider">Class</label>
            <select
              value={state.occupation}
              onChange={e => setState(s => ({ ...s, occupation: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950/80 text-amber-100 rounded border border-amber-700/50 focus:border-amber-400 outline-none font-serif"
            >
              <option>Warrior</option>
              <option>Mage</option>
              <option>Archer</option>
              <option>Rogue</option>
              <option>Paladin</option>
              <option>Cleric</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-amber-900/30">
            <label className="block text-xs font-serif text-amber-300 mb-2 uppercase tracking-wider">Starting Point</label>
            <select
              value={state.world}
              onChange={e => setState(s => ({ ...s, world: e.target.value as World }))}
              className="w-full px-3 py-2 bg-slate-950/80 text-amber-100 rounded border border-amber-700/50 focus:border-amber-400 outline-none font-serif"
            >
              <option value="The Wayside Inn">The Wayside Inn</option>
              <option value="The Borderland Ruin">The Borderland Ruin</option>
              <option value="The Whispering Hallow">The Whispering Hallow</option>
            </select>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-amber-900/30">
            <label className="block text-xs font-serif text-amber-300 mb-2 uppercase tracking-wider">English Level</label>
            <select
              value={state.difficulty}
              onChange={e => setState(s => ({ ...s, difficulty: parseInt(e.target.value) as Difficulty }))}
              className="w-full px-3 py-2 bg-slate-950/80 text-amber-100 rounded border border-amber-700/50 focus:border-amber-400 outline-none font-serif"
            >
              {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} Star{d > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-lg border border-amber-900/30">
          <label className="block text-xs font-serif text-amber-300 mb-2 uppercase tracking-wider">Destiny</label>
          <select
            value={state.goal}
            onChange={e => setState(s => ({ ...s, goal: e.target.value as Goal }))}
            className="w-full px-3 py-2 bg-slate-950/80 text-amber-100 rounded border border-amber-700/50 focus:border-amber-400 outline-none font-serif"
          >
            <option value="Defeat your Enemy">Defeat your Enemy</option>
            <option value="Open Survival">Open Survival</option>
          </select>
        </div>

        <button
          onClick={handleStart}
          disabled={!state.playerName || state.loading}
          className="w-full py-4 mt-4 bg-gradient-to-b from-amber-600 to-amber-800 text-amber-50 border border-amber-400/50 rounded font-serif font-bold text-xl shadow-[0_0_15px_rgba(217,119,6,0.5)] hover:shadow-[0_0_25px_rgba(217,119,6,0.8)] hover:from-amber-500 hover:to-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 uppercase tracking-widest"
        >
          {state.loading ? <RefreshCw className="animate-spin" /> : <Sword />}
          {state.loading ? "Summoning Realm..." : "Begin Journey"}
        </button>

        {state.error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-center font-serif">
            {state.error}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderAdventure = () => {
    const getProficiency = (val: number) => {
      if (val < 25) return 'Novice';
      if (val < 50) return 'Intermediate';
      if (val < 75) return 'Advanced';
      return 'Master';
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-32">
        {/* Status Dashboard */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-md p-4 shadow-lg border-b border-white/20 fixed top-0 left-0 right-0 z-50"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1 text-red-500 whitespace-nowrap">
                <Heart size={18} fill="currentColor" />
                <span className="font-bold">{state.stats.hp}/100</span>
              </div>
              <div className="flex items-center gap-1 text-amber-500 whitespace-nowrap">
                <Utensils size={18} fill="currentColor" />
                <span className="font-bold">{state.stats.hunger}/100</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-500 whitespace-nowrap" title="Lumes (Custom Actions)">
                <Sparkles size={18} fill="currentColor" />
                <span className="font-bold">{state.stats.lumes}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 whitespace-nowrap" title="Silver">
                <Coins size={18} fill="currentColor" />
                <span className="font-bold text-slate-600">{state.stats.silver}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-500 whitespace-nowrap" title="Alignment (Good/Evil)">
                <Scale size={18} fill="currentColor" />
                <span className="font-bold">{state.stats.alignment}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 whitespace-nowrap mr-auto">
                <WeightIcon size={18} />
                <span className="font-bold">{state.stats.weight}/{state.stats.maxWeight}</span>
              </div>
              <div className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold whitespace-nowrap">
                {state.race} {state.occupation}
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-gray-600">
                <Sword size={16} />
                <span>{state.weapon}</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-gray-600">
                <Users size={16} />
                <span>{state.companion}</span>
              </div>
              <div className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs whitespace-nowrap font-medium">
                Level: {state.difficulty}⭐
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs">
                <Zap size={14} className="text-indigo-500 shrink-0" />
                <span className="text-gray-500 shrink-0">Skill:</span>
                <span className="font-bold text-indigo-600 truncate">
                  {state.skillName} {state.skillName !== 'None' && `(${getProficiency(state.stats.skill)})`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Brain size={14} className="text-purple-500 shrink-0" />
                <span className="text-gray-500 shrink-0">Magic:</span>
                <span className="font-bold text-purple-600 truncate">
                  {state.specialName} {state.specialName !== 'None' && `(${getProficiency(state.stats.special)})`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Brain size={14} className="text-blue-500 shrink-0" />
                <span className="text-gray-500 shrink-0">Int:</span>
                <span className="font-bold text-blue-600">{state.stats.int}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Dumbbell size={14} className="text-emerald-500 shrink-0" />
                <span className="text-gray-500 shrink-0">Str:</span>
                <span className="font-bold text-emerald-600">{state.stats.str}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Story Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
        >
          {image && (
            <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
              <img src={image} alt="Adventure Scene" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="prose prose-indigo max-w-none">
              {isTyping ? (
                <TypewriterMarkdown text={state.currentStory} onComplete={handleTypingComplete} />
              ) : (
                <Markdown>{state.currentStory}</Markdown>
              )}
            </div>
          </div>
        </motion.div>

        {/* Language Lab */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowLab(!showLab)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-indigo-600 font-bold">
              <Brain size={20} />
              <span>💡 Language Lab</span>
            </div>
            {showLab ? <ChevronUp /> : <ChevronDown />}
          </button>

          <AnimatePresence>
            {showLab && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-gray-100"
              >
                <div className="p-6 space-y-6 bg-indigo-50/30">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Play size={14} /> Key Vocabulary & Phrasal Verbs
                    </h4>
                    <div className="grid gap-4">
                      {state.vocabulary.map((v, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-indigo-700">{v.word}</span>
                            <span className="text-sm text-gray-500">{v.translation}</span>
                          </div>
                          <p className="text-sm text-gray-600 italic">"{v.example}"</p>
                          <p className="text-xs text-gray-400">{v.exampleTranslation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {state.grammar && (
                    <div className="bg-indigo-600 text-white p-4 rounded-xl">
                      <h4 className="text-sm font-bold uppercase tracking-wider mb-2">Grammar / Structure Focus</h4>
                      <p className="font-bold mb-1">{state.grammar.structure}</p>
                      <p className="text-sm opacity-90 mb-3">{state.grammar.explanation}</p>
                      <div className="bg-white/10 p-2 rounded-lg text-sm">
                        <p className="italic">Example: {state.grammar.example}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {state.error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle size={18} /> Error
            </div>
            <p>{state.error}</p>
          </div>
        )}

        {/* Choices */}
        <div className="grid gap-3">
          {state.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => handleChoice(c)}
              disabled={state.loading || isTyping}
              className="group relative w-full p-4 bg-white hover:bg-indigo-600 hover:text-white rounded-2xl shadow-md border border-gray-100 transition-all text-left flex items-center justify-between disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 group-hover:bg-white/20 group-hover:text-white rounded-full font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium">{c.text}</span>
                </div>
              </div>
              <Play size={16} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}

          {/* 6th Custom Option */}
          <div className="relative w-full p-2 bg-white rounded-2xl shadow-md border border-amber-200 flex items-center gap-2 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 transition-all">
            <div className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-full font-bold shrink-0 ml-2">
              6
            </div>
            <input
              type="text"
              value={customAction}
              onChange={e => setCustomAction(e.target.value)}
              placeholder={state.stats.lumes >= 1 ? "Type your own action..." : "Not enough Lumes..."}
              disabled={state.loading || isTyping || state.stats.lumes < 1}
              className="flex-1 bg-transparent outline-none px-2 py-2 text-slate-700 placeholder:text-slate-400 disabled:opacity-50"
              onKeyDown={e => {
                if (e.key === 'Enter' && customAction.trim() && state.stats.lumes >= 1 && !state.loading && !isTyping) {
                  handleChoice({ text: customAction, action: customAction, isCustom: true });
                  setCustomAction('');
                }
              }}
            />
            <button
              onClick={() => {
                if (customAction.trim() && state.stats.lumes >= 1 && !state.loading && !isTyping) {
                  handleChoice({ text: customAction, action: customAction, isCustom: true });
                  setCustomAction('');
                }
              }}
              disabled={state.loading || isTyping || state.stats.lumes < 1 || !customAction.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:hover:bg-amber-500 shrink-0"
            >
              <Sparkles size={14} />
              <span>-1 Lume</span>
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <button
            onClick={() => setState({
              phase: 'INITIALIZATION',
              playerName: '',
              gender: 'Male',
              race: 'Human',
              occupation: 'Warrior',
              world: 'The Wayside Inn',
              difficulty: 1,
              goal: 'Defeat your Enemy',
              stats: INITIAL_STATS,
              weapon: 'None',
              companion: 'None',
              skillName: 'Basic Melee',
              specialName: 'None',
              history: [],
              currentStory: '',
              currentImagePrompt: '',
              vocabulary: [],
              grammar: null,
              choices: [],
              loading: false,
            })}
            className="text-gray-400 hover:text-red-500 text-sm font-medium transition-colors"
          >
            Reset and back to the front page
          </button>
        </div>

        {state.loading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <RefreshCw className="animate-spin text-indigo-600" size={48} />
              <p className="font-bold text-gray-600">Generating your adventure...</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGameOver = () => (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-md mx-auto p-12 bg-white rounded-3xl shadow-2xl text-center border border-red-100"
    >
      <AlertCircle size={64} className="text-red-500 mx-auto mb-6" />
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Adventure Ended</h2>
      <p className="text-gray-500 mb-8">Your journey has come to an end. But every end is a new beginning.</p>

      <button
        onClick={() => setState({
          phase: 'INITIALIZATION',
          playerName: '',
          gender: 'Male',
          race: 'Human',
          occupation: 'Warrior',
          world: 'The Wayside Inn',
          difficulty: 1,
          goal: 'Defeat your Enemy',
          stats: INITIAL_STATS,
          weapon: 'None',
          companion: 'None',
          skillName: 'Basic Melee',
          specialName: 'None',
          history: [],
          currentStory: '',
          currentImagePrompt: '',
          vocabulary: [],
          grammar: null,
          choices: [],
          loading: false,
        })}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors"
      >
        Reset and back to the front page
      </button>
    </motion.div>
  );

  return (
    <>
      {!isAuthenticating && (
        <div className={`min-h-screen transition-colors duration-1000 ${state.phase === 'INITIALIZATION' ? 'bg-slate-950 text-amber-50' : 'bg-[#f8fafc] text-slate-900'} font-sans selection:bg-amber-500/30`}>
          <div className={`fixed inset-0 pointer-events-none transition-opacity duration-1000 ${state.phase === 'INITIALIZATION' ? 'opacity-20' : 'opacity-100'} bg-[radial-gradient(${state.phase === 'INITIALIZATION' ? '#d97706_1px' : '#e2e8f0_1px'},transparent_1px)] [background-size:20px_20px]`} />

          <VFXOverlay />

          {state.phase === 'INITIALIZATION' && (
            <>
              <button
                onClick={() => window.location.href = 'https://portal.eti.com.hk/landing/'}
                className="fixed top-6 left-6 z-[60] p-3 bg-white/10 backdrop-blur-md text-amber-200 rounded-full hover:bg-white/20 transition-all border border-white/20 shadow-xl group"
                title="Back to Portal"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <SessionTimer 
                token={token} 
                className="fixed top-6 right-6 z-[60] p-3 bg-white/10 backdrop-blur-md text-amber-200 rounded-full hover:bg-white/20 transition-all border border-white/20 shadow-xl" 
                showLabel={true} 
              />
            </>
          )}

          <main className="relative container mx-auto px-4 py-12 z-10">
            <AnimatePresence mode="wait">
              {state.phase === 'INITIALIZATION' && renderInitialization()}
              {state.phase === 'ADVENTURE' && renderAdventure()}
              {state.phase === 'GAME_OVER' && renderGameOver()}
            </AnimatePresence>
          </main>
        </div>
      )}
    </>
  );
}
