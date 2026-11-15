window.CONTENT = {
  zh: {
    meta: {
      title: "金灿灿 Golden",
      description: "Linux 内核、C++20 服务器、自训 1B 模型、魔方与 3D 打印。作品与近况。"
    },
    ui: {
      langLabel: "EN",
      themeLight: "亮色",
      themeDark: "暗色",
      menu: "菜单",
      close: "关闭",
      scrollHint: "向下",
      backTop: "回到顶部",
      loading: "加载中",
      enterLabel: "进入",
      copyright: "© 2026 Golden",
      ctaWorks: "看作品",
      ctaContact: "联系我",
      copy: "复制",
      copied: "已复制",
      open: "打开",
      replay: "重放",
      prevPhoto: "上一张",
      nextPhoto: "下一张"
    },
    nav: {
      about: "关于我",
      skills: "技术栈",
      works: "作品集",
      ai: "大模型",
      arena: "赛场",
      cube: "玩魔方",
      fab: "3D 打印",
      life: "生活",
      contact: "联系我"
    },
    loader: {
      wordmark: "GOLDEN",
      kicker: "作品集 · 2026",
      steps: ["系统", "场景", "接口"]
    },
    hero: {
      titleZh: "金灿灿",
      titleEn: "GOLDEN",
      tagline: "写内核，训模型，拧魔方。"
    },
    about: {
      title: "关于我",
      lead: "Linux 内核起步，现在训练模型。",
      paras: [
        "内核和 C++ 是底盘。高性能服务器、AI Agents 都从这里长出来。",
        "写代码，也拍照、骑车、打游戏、解谜。"
      ],
      portrait: {
        role: "系统 / 模型 / 手作",
        note: "提示：你可能觉得非常帅，但这不是网图"
      },
      stats: [
        { value: "1B", unit: "参数", label: "自训模型" },
        { value: "02", unit: "天", label: "学会魔方" },
        { value: "SUB35", unit: "", label: "魔方成绩" },
        { value: "2026", unit: "", label: "黑客松" }
      ],
      creed: [
        { no: "01", zh: "清晰优于巧妙", en: "Clarity over cleverness" },
        { no: "02", zh: "简单即力量", en: "Simplicity is power" },
        { no: "03", zh: "持续演进", en: "Keep evolving" },
        { no: "04", zh: "以人为本", en: "Built for people" }
      ]
    },
    skills: {
      title: "我在做这些",
      groups: [
        {
          no: "01",
          en: "LINUX & SYSTEMS",
          zh: "Linux 与系统",
          items: ["内核", "系统调用", "进程", "内存", "服务器"]
        },
        {
          no: "02",
          en: "C++ & ARCHITECTURE",
          zh: "C++ 与架构",
          items: ["C++17", "C++20", "协程", "并发", "零拷贝"]
        },
        {
          no: "03",
          en: "AI & MODELS",
          zh: "AI 与大模型",
          items: ["机器学习", "深度学习", "Agent", "自训模型"]
        },
        {
          no: "04",
          en: "3D & MAKING",
          zh: "3D 与创造",
          items: ["3D 打印", "建模", "切片", "魔方"]
        }
      ]
    },
    works: {
      title: "旧作与新作",
      items: [
        {
          no: "01",
          year: "旧作",
          en: "AURORA",
          zh: "Aurora 服务器框架",
          role: "作者",
          desc: "C++20 协程加零拷贝的异步服务器框架。",
          tags: ["C++20", "协程", "零拷贝"]
        },
        {
          no: "02",
          year: "旧作",
          en: "LUMEN",
          zh: "Lumen 协作平台",
          role: "作者",
          desc: "AI Agents 协作平台，研究人怎么和 Agent 一起干活。",
          tags: ["AI Agents", "人机交互", "技术心理学"]
        },
        {
          no: "03",
          year: "旧作",
          en: "SOLARIS",
          zh: "Solaris 监控套件",
          role: "作者",
          desc: "Linux 系统监控，内核指标看得见。",
          tags: ["Linux", "内核", "监控"]
        },
        {
          no: "04",
          year: "新作",
          en: "1B MODEL",
          zh: "1B 自训模型",
          role: "训练者",
          desc: "1B 参数自训模型，能力和同量级优秀开源小模型持平。",
          tags: ["自训", "1B", "大模型"]
        }
      ]
    },
    ai: {
      title: "从零训到 1B",
      lead: "自己写训练脚本，自己训模型。",
      fields: [
        { k: "参数", v: "约 1B" },
        { k: "架构", v: "Decoder-only" },
        { k: "组件", v: "RoPE · GQA · SwiGLU" },
        { k: "阶段", v: "预训练 → SFT → DPO" }
      ]
    },
    arena: {
      title: "赛场",
      event: {
        no: "01",
        title: "PAYATHON2026",
        status: "筹备中",
        tracks: ["vibe 赛道", "agent 赛道"],
        note: "其余赛事待揭晓"
      },
      roadmap: [
        { no: "01", zh: "PAYATHON2026", en: "PAYATHON 2026", state: "筹备" },
        { no: "02", zh: "更多赛事", en: "MORE EVENTS", state: "待揭晓" },
        { no: "03", zh: "作品见", en: "SEE YOU THERE", state: "敬请期待" }
      ]
    },
    cube: {
      title: "两天到 sub35",
      lead: "两天到 sub35，还在练。",
      hint: "拖动旋转。打乱，再还原。",
      stats: [
        { k: "成绩", v: "sub35" },
        { k: "用了", v: "2 天" },
        { k: "目标", v: "更快" }
      ],
      scramble: "打乱",
      solve: "还原",
      reset: "重置"
    },
    fab: {
      title: "从屏幕到实物",
      lead: "最近在折腾 3D 打印。",
      cinema: {
        kicker: "// 07 · FABRICATION",
        title: ["从屏幕", "到实物"],
        intro: ["分层路径决定强度与表面。", "一层压一层，机器走完最后一段。"],
        city: "深圳",
        status: ["打印城市", "铺设海岸", "完成"],
        skip: "跳过",
        replay: "重播 3D 城市",
        layerLabel: "层",
        caption: "平安金融中心 · 周边城市集群 · 深圳湾"
      },
      stages: [
        { no: "01", en: "MODEL", zh: "建模", desc: "从尺寸开始，把想法变成能打印的实体。" },
        { no: "02", en: "SLICE", zh: "切片", desc: "分层的路径决定强度、支撑和表面。" },
        { no: "03", en: "PRINT", zh: "打印", desc: "一层压一层，机器走完最后一段。" }
      ]
    },
    life: {
      title: "镜头、车、关卡",
      lead: "摄影、骑行、RPG 和解谜。",
      blocks: [
        { no: "01", en: "PHOTO", zh: "摄影", desc: "用镜头找光、构图和时机。这些标准也拿来写界面。" },
        { no: "02", en: "RIDE", zh: "骑行", desc: "长途骑行教会我节奏和坚持。上坡和下坡都会来。" },
        { no: "03", en: "PLAY", zh: "RPG · 解谜", desc: "喜欢 RPG 的世界观，也喜欢解谜里那种「就快到了」。" }
      ],
      photos: [
        { src: "assets/img/life-1.jpg", alt: "摄影：光线与空间", captionZh: "光", captionEn: "LIGHT" },
        { src: "assets/img/life-2.jpg", alt: "骑行：路与远处", captionZh: "路", captionEn: "ROAD" },
        { src: "assets/img/life-3.jpg", alt: "解谜：路径与结构", captionZh: "关", captionEn: "LEVEL" },
        { src: "assets/img/life-4.jpg", alt: "自然：湖面与山", captionZh: "静", captionEn: "STILL" },
        { src: "assets/img/life-5.jpg", alt: "自然：林间小径", captionZh: "野", captionEn: "WILD" }
      ],
      puzzle: {
        title: "推一格",
        hint: "点空格旁边的方块。",
        scramble: "打乱",
        reset: "复原",
        solved: "解开了",
        moves: "步"
      }
    },
    contact: {
      title: "直接找我",
      items: [
        {
          no: "01",
          label: "QQ",
          value: "3816355077 / 23589533",
          href: "tencent://message/?uin=3816355077"
        },
        {
          no: "02",
          label: "微信",
          value: "cancan-888888",
          href: "weixin://"
        },
        {
          no: "03",
          label: "邮箱",
          value: "Jcc110407@outlook.com",
          href: "mailto:Jcc110407@outlook.com"
        },
        {
          no: "04",
          label: "Bilibili",
          value: "Golden金灿灿",
          href: "https://search.bilibili.com/all?keyword=Golden%E9%87%91%E7%81%BF%E7%81%BF"
        }
      ]
    },
    footer: {
      line: "© 2026 Golden · 金灿灿"
    }
  },
  en: {
    meta: {
      title: "Golden",
      description: "Linux kernels, C++20 servers, a self-trained 1B model, a cube and 3D printing. Work and notes."
    },
    ui: {
      langLabel: "中文",
      themeLight: "Light",
      themeDark: "Dark",
      menu: "Menu",
      close: "Close",
      scrollHint: "Scroll",
      backTop: "Back to top",
      loading: "Loading",
      enterLabel: "Enter",
      copyright: "© 2026 Golden",
      ctaWorks: "See works",
      ctaContact: "Say hi",
      copy: "Copy",
      copied: "Copied",
      open: "Open",
      replay: "Replay",
      prevPhoto: "Previous",
      nextPhoto: "Next"
    },
    nav: {
      about: "About",
      skills: "Skills",
      works: "Works",
      ai: "Model",
      arena: "Arena",
      cube: "Cube",
      fab: "3D Print",
      life: "Life",
      contact: "Contact"
    },
    loader: {
      wordmark: "GOLDEN",
      kicker: "PORTFOLIO · 2026",
      steps: ["SYSTEM", "SCENE", "INTERFACE"]
    },
    hero: {
      titleZh: "金灿灿",
      titleEn: "GOLDEN",
      tagline: "I write kernels, train models, and solve cubes."
    },
    about: {
      title: "ABOUT",
      lead: "Kernels first. Models now.",
      paras: [
        "Started in the Linux kernel, then C++ servers, then AI agents.",
        "I write code. Off-screen: photography, cycling, games and puzzles."
      ],
      portrait: {
        role: "Systems / Models / Hands",
        note: "Note: you might find this very handsome — it is not a stock photo"
      },
      stats: [
        { value: "1B", unit: "params", label: "Model trained" },
        { value: "02", unit: "days", label: "To learn cube" },
        { value: "SUB35", unit: "", label: "Cube solve" },
        { value: "2026", unit: "", label: "Hackathons" }
      ],
      creed: [
        { no: "01", zh: "清晰优于巧妙", en: "Clarity over cleverness" },
        { no: "02", zh: "简单即力量", en: "Simplicity is power" },
        { no: "03", zh: "持续演进", en: "Keep evolving" },
        { no: "04", zh: "以人为本", en: "Built for people" }
      ]
    },
    skills: {
      title: "WHAT I DO",
      groups: [
        {
          no: "01",
          en: "LINUX & SYSTEMS",
          zh: "Linux & Systems",
          items: ["Kernel", "Syscalls", "Process", "Memory", "Servers"]
        },
        {
          no: "02",
          en: "C++ & ARCHITECTURE",
          zh: "C++ & Architecture",
          items: ["C++17", "C++20", "Coroutines", "Concurrency", "Zero-copy"]
        },
        {
          no: "03",
          en: "AI & MODELS",
          zh: "AI & Models",
          items: ["Machine Learning", "Deep Learning", "Agents", "Own Model"]
        },
        {
          no: "04",
          en: "3D & MAKING",
          zh: "3D & Making",
          items: ["3D Printing", "Modeling", "Slicing", "Cube"]
        }
      ]
    },
    works: {
      title: "OLD & NEW",
      items: [
        {
          no: "01",
          year: "LEGACY",
          en: "AURORA",
          zh: "Aurora server framework",
          role: "Author",
          desc: "A C++20 async server framework with coroutines and zero-copy.",
          tags: ["C++20", "Coroutines", "Zero-copy"]
        },
        {
          no: "02",
          year: "LEGACY",
          en: "LUMEN",
          zh: "Lumen collaboration platform",
          role: "Author",
          desc: "An agent platform for human-agent collaboration.",
          tags: ["AI Agents", "Interaction", "Psychology"]
        },
        {
          no: "03",
          year: "LEGACY",
          en: "SOLARIS",
          zh: "Solaris monitoring suite",
          role: "Author",
          desc: "Linux system monitoring with kernel metrics made visible.",
          tags: ["Linux", "Kernel", "Monitoring"]
        },
        {
          no: "04",
          year: "NEW",
          en: "1B MODEL",
          zh: "1B model, trained",
          role: "Trainer",
          desc: "A 1B model I trained, on par with the best open models at its size.",
          tags: ["Trained", "1B", "LLM"]
        }
      ]
    },
    ai: {
      title: "FROM SCRATCH TO 1B",
      lead: "I write the training scripts and train the model.",
      fields: [
        { k: "Params", v: "~1B" },
        { k: "Arch", v: "Decoder-only" },
        { k: "Blocks", v: "RoPE · GQA · SwiGLU" },
        { k: "Stages", v: "Pretrain → SFT → DPO" }
      ]
    },
    arena: {
      title: "赛场",
      event: {
        no: "01",
        title: "PAYATHON2026",
        status: "PREPARING",
        tracks: ["Vibe track", "Agent track"],
        note: "More events to be announced"
      },
      roadmap: [
        { no: "01", zh: "PAYATHON2026", en: "PAYATHON 2026", state: "PREP" },
        { no: "02", zh: "更多赛事", en: "MORE EVENTS", state: "TBA" },
        { no: "03", zh: "作品见", en: "SEE YOU THERE", state: "SOON" }
      ]
    },
    cube: {
      title: "TWO DAYS TO SUB35",
      lead: "Two days of cubing, already sub35.",
      hint: "Drag to orbit. Scramble, then solve.",
      stats: [
        { k: "Solve", v: "sub35" },
        { k: "Learned in", v: "2 days" },
        { k: "Goal", v: "Faster" }
      ],
      scramble: "Scramble",
      solve: "Solve",
      reset: "Reset"
    },
    fab: {
      title: "FROM SCREEN TO OBJECT",
      lead: "Lately: 3D printing.",
      cinema: {
        kicker: "// 07 · FABRICATION",
        title: ["FROM SCREEN", "TO OBJECT"],
        intro: ["Layer paths decide strength and surface.", "Layer on layer, the machine walks the last mile."],
        city: "深圳",
        status: ["BUILDING CITY", "LAYING COAST", "READY"],
        skip: "SKIP",
        replay: "REPLAY 3D CITY",
        layerLabel: "LAYER",
        caption: "Ping An Finance Center · CBD cluster · Shenzhen Bay"
      },
      stages: [
        { no: "01", en: "MODEL", zh: "Model", desc: "Start from dimensions. Turn an idea into something printable." },
        { no: "02", en: "SLICE", zh: "Slice", desc: "Layers decide strength, support and surface." },
        { no: "03", en: "PRINT", zh: "Print", desc: "Layer on layer, the machine walks the last mile." }
      ]
    },
    life: {
      title: "LENS, BIKE, LEVEL",
      lead: "Photography, cycling, RPGs and puzzles.",
      blocks: [
        { no: "01", en: "PHOTO", zh: "Photography", desc: "Light, framing, timing. The same rules run the interfaces." },
        { no: "02", en: "RIDE", zh: "Cycling", desc: "Long rides teach rhythm and patience. Uphills and downhills both come." },
        { no: "03", en: "PLAY", zh: "RPG & puzzles", desc: "Worlds in RPGs, and that almost-there feeling in a puzzle." }
      ],
      photos: [
        { src: "assets/img/life-1.jpg", alt: "Photography: light and space", captionZh: "光", captionEn: "LIGHT" },
        { src: "assets/img/life-2.jpg", alt: "Cycling: road and distance", captionZh: "路", captionEn: "ROAD" },
        { src: "assets/img/life-3.jpg", alt: "Puzzle: path and structure", captionZh: "关", captionEn: "LEVEL" },
        { src: "assets/img/life-4.jpg", alt: "Nature: lake and mountains", captionZh: "静", captionEn: "STILL" },
        { src: "assets/img/life-5.jpg", alt: "Nature: forest path", captionZh: "野", captionEn: "WILD" }
      ],
      puzzle: {
        title: "One Tile",
        hint: "Tap a tile next to the gap.",
        scramble: "Shuffle",
        reset: "Reset",
        solved: "Solved",
        moves: "moves"
      }
    },
    contact: {
      title: "SAY HI",
      items: [
        {
          no: "01",
          label: "QQ",
          value: "3816355077 / 23589533",
          href: "tencent://message/?uin=3816355077"
        },
        {
          no: "02",
          label: "WeChat",
          value: "cancan-888888",
          href: "weixin://"
        },
        {
          no: "03",
          label: "Email",
          value: "Jcc110407@outlook.com",
          href: "mailto:Jcc110407@outlook.com"
        },
        {
          no: "04",
          label: "Bilibili",
          value: "Golden金灿灿",
          href: "https://search.bilibili.com/all?keyword=Golden%E9%87%91%E7%81%BF%E7%81%BF"
        }
      ]
    },
    footer: {
      line: "© 2026 Golden"
    }
  }
};
