/* =============================================================================
   arch.js — GoldenArch, an interactive decoder-only Transformer schematic for
   the Endfield-styled blog. Classic script, no modules, no dependencies.

     var api = window.GoldenArch.mount(rootEl, {
       lang: 'zh' | 'en', theme: 'dark' | 'light', reduce: boolean
     });
     api.setLang(lang) · api.setTheme(theme) · api.pause() · api.resume()
     api.dispose()

   The module injects its whole DOM inside rootEl and reads every colour from
   main.css tokens (--paper --panel --panel-2 --ink --ink-2 --rule --chip
   --signal --on-signal --trace). It never names a model — it only shows the
   architecture: RMSNorm · RoPE · GQA · SwiGLU · KV cache · tied embeddings.
   ========================================================================== */
(function (global) {
  'use strict';
  if (global.GoldenArch) { return; }

  /* ── copy (bilingual) ──────────────────────────────────────────────────── */
  var COPY = {
    overview: { no: '00', en: 'AUTOREGRESSIVE DECODER', zh: '自回归解码器',
      dEn: 'Tokens enter from the top, cross N identical blocks, and the final position produces a distribution over the next token. The sampled token is appended to the input and the whole loop runs again.',
      dZh: 'token 从顶部进入，穿过 N 个结构相同的模块，最后一位给出下一个 token 的分布；采样结果追加回输入，循环重新开始。',
      meta: ['DECODER-ONLY', 'NEXT-TOKEN'] },
    tokens: { no: '01', en: 'INPUT TOKENS', zh: '输入 TOKEN',
      dEn: 'Raw text is split into subword tokens and mapped to integer ids. The batch and sequence shape (B, T) is what every later stage transforms.',
      dZh: '文本先被切成子词 token，再映射成整数 id；形状 (B, T) 贯穿后续所有阶段。',
      meta: ['B × T', 'INT IDS'] },
    embed: { no: '02', en: 'TOKEN EMBEDDING', zh: '词嵌入',
      dEn: 'A lookup table turns each id into a d-dimensional vector. The same matrix is reused as the LM head, so the two ends of the network share weights.',
      dZh: '查表把每个 id 变成 d 维向量；同一个矩阵同时用作输出层，模型两端共享权重。',
      meta: ['V → d', 'TIED ⇄ LM HEAD'] },
    blocks: { no: '03', en: 'TRANSFORMER BLOCK × N', zh: 'TRANSFORMER 模块 × N',
      dEn: 'N structurally identical layers run in series. Each one mixes information across positions with attention, then transforms each position with a feed-forward network; residuals and RMSNorm keep the deep stack stable.',
      dZh: 'N 个结构相同的层串联：先用注意力在位置之间交换信息，再用前馈网络逐位置变换；残差和 RMSNorm 让深栈保持稳定。',
      meta: ['× N LAYERS', 'WEIGHTS SHARED'] },
    norm1: { no: 'R1', en: 'RMSNORM', zh: 'RMS 归一化',
      dEn: 'Before attention the stream is scaled by its own root-mean-square. There is no mean subtraction and no bias, so the layer adds only a per-dimension gain and stays cheap.',
      dZh: '进入注意力之前，按自身的均方根缩放。不减均值、不加偏置，只保留每维一个可学习缩放，参数和开销都很小。',
      meta: ['RMS', 'NO MEAN'] },
    qkv: { no: 'R2', en: 'GQA PROJECTIONS', zh: 'GQA 投影',
      dEn: 'Separate q, k and v projections are applied to every position, and each head gets a QK-norm to keep attention logits bounded. K and V have fewer heads than Q, so several query heads share one key/value head and the cache shrinks.',
      dZh: '每个位置分别做 q、k、v 投影，每个头再各自做一次 QK-Norm，防止注意力 logits 失控。K、V 的头数少于 Q，多个查询头共享一组 K/V，缓存因此更小。',
      meta: ['q · k · v', 'QK-NORM', 'h_kv < h_q'] },
    rope: { no: 'R3', en: 'ROPE ROTATION', zh: 'RoPE 旋转',
      dEn: 'Rotary position encoding rotates q and k by an angle proportional to their position. Attention scores then depend only on relative distance, and the model can extrapolate past the lengths it saw in training.',
      dZh: 'RoPE 用与位置成比例的角度旋转 q、k，使注意力分数只依赖相对距离，并能向训练长度之外外推。',
      meta: ['ROTARY', 'RELATIVE POS'] },
    mask: { no: 'R4', en: 'CAUSAL MASK · SOFTMAX', zh: '因果掩码 · SOFTMAX',
      dEn: 'Scores are divided by √d and the upper triangle is set to negative infinity, so position t can only see positions 0…t. Softmax then turns each row into a probability distribution over the past.',
      dZh: '分数先除以 √d，再把上三角置为负无穷，位置 t 只能看到 0…t；softmax 把每行变成对历史位置的注意力分布。',
      meta: ['CAUSAL', 'ROW-WISE'] },
    oproj: { no: 'R5', en: 'O_PROJ', zh: '输出投影',
      dEn: 'All heads are concatenated and projected back to d dimensions. The projection mixes what the heads found into a single update for the residual stream.',
      dZh: '所有头拼接后投影回 d 维，把各头找到的信息混合成对残差流的一次更新。',
      meta: ['d → d', 'W_O'] },
    res1: { no: 'R6', en: 'RESIDUAL ADD', zh: '残差连接',
      dEn: 'The attention update is added to the untouched input stream. Gradients can flow straight through the addition, which is what makes a deep stack trainable.',
      dZh: '注意力的输出加回未改动的主干；梯度可以沿加法直通，深栈才训得动。',
      meta: ['+', 'IDENTITY PATH'] },
    norm2: { no: 'R7', en: 'RMSNORM', zh: 'RMS 归一化',
      dEn: 'The second normalisation re-centres the stream before the feed-forward network, again with only a root-mean-square scale.',
      dZh: '第二个 RMSNorm 在前馈网络之前把主干重新拉回稳定范围，同样只做均方根缩放。',
      meta: ['RMS', 'PRE-FFN'] },
    ffn: { no: 'R8', en: 'SWIGLU FFN', zh: 'SwiGLU 前馈',
      dEn: 'gate_proj and up_proj expand the vector in parallel; SiLU is applied to the gate and multiplies the up branch element by element, and down_proj returns to d. There are no bias terms.',
      dZh: 'gate_proj 与 up_proj 并行升维，gate 分支过 SiLU 后与 up 分支逐元素相乘，再由 down_proj 降回 d 维；无 bias。',
      meta: ['gate × up', 'SiLU', 'BIAS-FREE'] },
    res2: { no: 'R9', en: 'RESIDUAL ADD', zh: '残差连接',
      dEn: 'The FFN update joins the stream again. The block ends here and the result becomes the input of the next layer.',
      dZh: '前馈网络的输出再次加回主干，本层结束，结果进入下一层。',
      meta: ['+', 'LAYER OUT'] },
    moe: { no: 'M', en: 'MIXTURE OF EXPERTS', zh: '专家混合',
      dEn: 'Optional variant: the single FFN becomes several experts behind a softmax router. Each token is sent to the top-k experts only, and an auxiliary load-balancing loss keeps traffic spread across them.',
      dZh: '可选变体：把单个前馈网络换成多个专家加一个 softmax 路由器，每个 token 只走 top-k 个专家；辅助损失维持专家负载均衡。',
      meta: ['OPTIONAL', 'TOP-K', 'AUX LOSS'] },
    finalnorm: { no: '04', en: 'FINAL RMSNORM', zh: '最终归一化',
      dEn: 'After the last block one more RMSNorm conditions the hidden state, so the LM head always sees vectors at a consistent scale.',
      dZh: '最后一层之后再归一化一次，让 LM Head 始终看到尺度一致的隐藏状态。',
      meta: ['RMSNORM', 'PRE-HEAD'] },
    lmhead: { no: '05', en: 'LM HEAD', zh: '输出头',
      dEn: 'A linear layer projects the hidden state onto the vocabulary, producing one score per candidate token. Its weights are tied to the token embedding table.',
      dZh: '线性层把隐藏状态投影到词表大小，每个候选 token 得到一个分数；权重与词嵌入共享。',
      meta: ['d → V', 'TIED ⇄ EMBED'] },
    logits: { no: '06', en: 'LOGITS', zh: 'LOGITS 分数',
      dEn: 'Unnormalised scores of shape (B, T, V). During generation only the last position matters, which is why the loop feeds back a single token at a time.',
      dZh: '形状 (B, T, V) 的未归一化分数；生成时只看最后一个位置，所以循环每次只回灌一个 token。',
      meta: ['B, T, V', 'RAW SCORES'] },
    sample: { no: '07', en: 'SOFTMAX · SAMPLING', zh: 'SOFTMAX · 采样',
      dEn: 'A temperature scales the scores, top-k and top-p truncate the tail, and one token is drawn from the remaining distribution. Greedy decoding simply takes the argmax.',
      dZh: '温度缩放分数，top-k 与 top-p 截断长尾，再从剩余分布中抽样；贪心解码则直接取最大。',
      meta: ['TEMPERATURE', 'TOP-K', 'TOP-P'] },
    next: { no: '08', en: 'NEXT TOKEN', zh: '下一个 TOKEN',
      dEn: 'The sampled token is appended to the sequence and fed back as input. Its key and value are stored in the cache, so the next step never recomputes the prefix.',
      dZh: '采样出的 token 追加到序列末尾并回灌为输入；它的 K/V 存入缓存，下一步无需重算前缀。',
      meta: ['T + 1', 'FEED BACK'] },
    kv: { no: 'KV', en: 'KV CACHE', zh: 'KV 缓存',
      dEn: 'Every layer stores the key and value of every token it has seen. Decoding only runs the new token, and the cache grows by one position per step — that is the strip below.',
      dZh: '每层缓存所有已见 token 的 K/V；解码时只计算新 token，缓存每步增长一位——就是下方面板里的条带。',
      meta: ['(B, h_kv, T, d_h)', '+1 / STEP'] },
    pretrain: { no: 'T1', en: 'PRETRAIN', zh: '预训练',
      dEn: 'Stage one: next-token prediction on a large unlabelled corpus. The model learns grammar, facts and reasoning patterns from nothing but the text that comes next.',
      dZh: '第一阶段：在大量无标注文本上做下一个 token 预测，只靠“下一个词”这一目标学会语法、事实与推理模式。',
      meta: ['SELF-SUPERVISED', 'NEXT-TOKEN CE'] },
    sft: { no: 'T2', en: 'SFT', zh: '监督微调',
      dEn: 'Stage two: instruction tuning on prompt/response pairs. The pretrained model is taught the format of an assistant and how to answer a direct request.',
      dZh: '第二阶段：用成对的指令与回答做监督微调，让预训练模型学会助手的对话格式和直接回答请求。',
      meta: ['PROMPT / RESPONSE', 'INSTRUCTION'] },
    lora: { no: 'T3', en: 'LORA', zh: '低秩微调',
      dEn: 'Stage three: freeze the base weights and train small low-rank adapters. Memory stays low, and a single adapter can be swapped in or out without touching the base model.',
      dZh: '第三阶段：冻结主权重，只训练低秩旁路矩阵。显存占用小，单个 adapter 可以随时插拔而不改动基座。',
      meta: ['FROZEN BASE', 'LOW-RANK ΔW'] },
    dpo: { no: 'T4', en: 'DPO', zh: '偏好对齐',
      dEn: 'Stage four: preference pairs are optimised directly. No separate reward model and no online RL loop, which makes alignment cheaper and steadier than a two-stage RL pipeline.',
      dZh: '第四阶段：直接用偏好对优化策略，不需要单独的奖励模型和在线 RL 循环，比两段式 RL 流程更省更稳。',
      meta: ['PREFERENCE PAIRS', 'NO REWARD MODEL'] }
  };

  var UI = {
    en: {
      eyebrow: '// MODEL ARCHITECTURE', title: 'DECODER-ONLY TRANSFORMER',
      sub: 'AUTOREGRESSIVE · NEXT-TOKEN PREDICTION',
      stage: 'STAGE', mode: 'MODE', pos: 'TOKEN POS', fwd: 'FWD →', train: 'TRAIN ∇',
      play: 'PLAY', pause: 'PAUSE', replay: 'REPLAY', optional: 'OPTIONAL',
      modeTrain: 'TRAIN ∇', modeFwd: 'FWD →',
      playAria: 'Play the forward pass', pauseAria: 'Pause the animation', replayAria: 'Replay the forward pass from the start',
      modeAria: 'Training mode', moeAria: 'Mixture-of-experts variant (optional)',
      hint: 'CLICK ANY STAGE FOR NOTES',
      loss: 'LOSS', lossDesc: 'DECREASING',
      maskTitle: 'CAUSAL MASK · 8×8', maskSub: 'ROW = QUERY · COL = KEY',
      kvTitle: 'KV CACHE', kvSub: 'GROWS +1 TOKEN / STEP', grows: 'CACHE +1 / STEP',
      trainTitle: 'TRAINING STAGES', trainSub: 'CLICK FOR DETAIL',
      panelTitle: 'BLOCK INTERNALS', panelNote: '×N IDENTICAL LAYERS · ONE MAGNIFIED',
      moeStrip: 'OPTIONAL · MoE', moeSub: 'SOFTMAX ROUTER · TOP-K EXPERTS · AUX LOAD-BALANCING LOSS',
      zoom: 'MAGNIFIED ×1', loop: 'AUTOREGRESSIVE LOOP · KV +1', backprop: '∇ BACKPROP',
      svgTitle: 'Decoder-only Transformer architecture',
      svgLabel: 'Decoder architecture schematic. Stages are clickable for notes.'
    },
    zh: {
      eyebrow: '// 模型架构', title: '解码器架构',
      sub: '自回归 · 下一 TOKEN 预测',
      stage: '阶段', mode: '模式', pos: '序列位置', fwd: '前向 →', train: '训练 ∇',
      play: '播放', pause: '暂停', replay: '重放', optional: '可选',
      modeTrain: '训练 ∇', modeFwd: '前向 →',
      playAria: '播放前向过程', pauseAria: '暂停动画', replayAria: '从头重放前向过程',
      modeAria: '训练模式', moeAria: '专家混合变体（可选）',
      hint: '点选任一阶段查看说明',
      loss: '损失', lossDesc: '下降',
      maskTitle: '因果掩码 · 8×8', maskSub: '行 = 查询 · 列 = 键',
      kvTitle: 'KV 缓存', kvSub: '每步 +1 TOKEN', grows: '缓存 +1 / 步',
      trainTitle: '训练阶段', trainSub: '点选查看',
      panelTitle: '模块内部', panelNote: '×N 个相同模块 · 放大 1 层',
      moeStrip: '可选 · MoE', moeSub: 'SOFTMAX 路由 · TOP-K 专家 · 负载均衡辅助损失',
      zoom: '放大 ×1', loop: '自回归循环 · KV +1', backprop: '∇ 反向传播',
      svgTitle: '解码器架构示意图',
      svgLabel: '解码器架构示意图，各阶段可点选查看说明。'
    }
  };

  /* internal stage rows: order matters — it is the forward path of one block */
  var ROWS = [
    { k: 'norm1', y: 104, sub: 'x · rsqrt(mean(x²) + ε)', spec: 'RMSNORM' },
    { k: 'qkv', y: 167, sub: 'q_proj · k_proj · v_proj · QK-NORM', spec: 'h_kv < h_q' },
    { k: 'rope', y: 230, sub: 'q, k ← rotate_half(q, k) · cos / sin', spec: 'ROPE' },
    { k: 'mask', y: 293, sub: 'causal mask · softmax(QKᵀ / √d)', spec: 'CAUSAL' },
    { k: 'oproj', y: 356, sub: 'concat(heads) · W_O', spec: 'd → d' },
    { k: 'res1', y: 419, sub: 'x = x + attn(x)', spec: '⊕ RESIDUAL' },
    { k: 'norm2', y: 495, sub: 'RMSNORM · pre-FFN', spec: 'RMSNORM' },
    { k: 'ffn', y: 558, sub: 'gate_proj · up_proj → SiLU → down_proj', spec: 'SWIGLU' },
    { k: 'res2', y: 621, sub: 'x = x + ffn(x)', spec: '⊕ RESIDUAL' }
  ];

  var TRAIN_KEYS = ['pretrain', 'sft', 'lora', 'dpo'];
  var PROMPT = ['A', 'MODEL', 'READS', 'THIS'];
  var SAMPLE_WORDS = ['THE', 'OF', 'AND', 'IN', 'TO', 'IS', 'IT', 'ON', 'BY', 'OR'];
  var MAX_KV = 10;

  var FULL_VB = '0 0 1280 760', NARROW_VB = '40 12 430 736';

  /* steps of one forward pass; hl = elements that light up together */
  var STEPS_FWD = [
    { k: 'tokens', d: 240 }, { k: 'embed', d: 240 }, { k: 'blocks', d: 300 },
    { k: 'norm1', d: 210 }, { k: 'qkv', d: 270 }, { k: 'rope', d: 240 },
    { k: 'mask', d: 270 }, { k: 'oproj', d: 210 }, { k: 'res1', d: 210 },
    { k: 'norm2', d: 210 }, { k: 'ffn', d: 300 }, { k: 'res2', d: 210 },
    { k: 'finalnorm', d: 250 }, { k: 'lmhead', d: 250 }, { k: 'logits', d: 210 },
    { k: 'sample', d: 280 }, { k: 'next', d: 280, hl: ['next'] },
    { k: 'append', d: 300, hl: ['append', 'kv'] }
  ];
  var STEPS_BACK = STEPS_FWD.slice().reverse();

  /* ── helpers ───────────────────────────────────────────────────────────── */
  function pad(n, l) { var s = String(n); while (s.length < l) { s = '0' + s; } return s; }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function q(scope, sel) { return scope.querySelector(sel); }

  /* ── svg markup ────────────────────────────────────────────────────────── */
  function svgMarkup() {
    var s = '';
    s += '<defs>'
      + '<marker id="a-arr" markerWidth="7" markerHeight="6" refX="6.5" refY="3" orient="auto" markerUnits="userSpaceOnUse">'
      + '<path class="a-arrow" d="M0 0L7 3L0 6Z"/></marker>'
      + '<marker id="a-arr-sig" markerWidth="7" markerHeight="6" refX="6.5" refY="3" orient="auto" markerUnits="userSpaceOnUse">'
      + '<path class="a-arrow-sig" d="M0 0L7 3L0 6Z"/></marker>'
      + '</defs>';

    /* magnified block panel */
    s += '<g class="a-panel-g">'
      + '<rect class="a-panel" x="500" y="24" width="756" height="724"/>'
      + '<text class="a-panel-title" x="520" y="52" data-ui="panelTitle"></text>'
      + '<text class="a-panel-sub" x="520" y="70" data-ui="panelNote"></text>'
      + '<text class="a-panel-sub" x="1240" y="52" text-anchor="end">SELF-ATTENTION · FFN</text>'
      + '<text class="a-panel-sub" x="1240" y="70" text-anchor="end" data-ui="zoom"></text>'
      + '<path class="a-panel-rule" d="M500 86H1256"/>';

    var ticks = '';
    each(ROWS, function (r) { ticks += 'M514 ' + (r.y + 27) + 'H520'; });
    s += '<path class="a-rail" d="M514 104V675' + ticks + '"/>';

    each(ROWS, function (r) {
      s += '<g class="a-row" data-stage="' + r.k + '">'
        + '<rect class="a-row-bg" x="516" y="' + r.y + '" width="724" height="54" pointer-events="all"/>'
        + '<text class="a-row-no" x="540" y="' + (r.y + 22) + '">R' + (ROWS.indexOf(r) + 1) + '</text>'
        + '<text class="a-row-label" x="566" y="' + (r.y + 23) + '" data-k="' + r.k + '"></text>'
        + '<text class="a-row-sub" x="566" y="' + (r.y + 40) + '">' + esc(r.sub) + '</text>'
        + '<text class="a-row-spec" x="1230" y="' + (r.y + 34) + '">' + esc(r.spec) + '</text>'
        + '<text class="a-upd" x="1230" y="' + (r.y + 15) + '" text-anchor="end">∇</text>'
        + '</g>';
    });

    /* group divider between attention and FFN */
    s += '<path class="a-panel-rule" d="M516 484H1118" stroke-dasharray="3 3"/>'
      + '<text class="a-divider-txt" x="1132" y="487">FEED-FORWARD ↓</text>';

    /* optional MoE strip */
    s += '<g class="a-moe" data-stage="moe">'
      + '<rect class="a-hit" x="516" y="686" width="724" height="54" pointer-events="all"/>'
      + '<rect class="a-moe-box" x="516" y="686" width="724" height="54"/>'
      + '<text class="a-moe-title" x="534" y="708" data-ui="moeStrip"></text>'
      + '<text class="a-moe-sub" x="534" y="726" data-ui="moeSub"></text>'
      + '<text class="a-row-spec" x="1080" y="718">TOP-1</text>';
    for (var e = 0; e < 4; e++) {
      s += '<rect class="a-expert' + (e === 0 ? ' is-top' : '') + '" x="' + (1104 + e * 26) + '" y="702" width="18" height="18"/>'
        + '<text class="a-expert-txt" x="' + (1113 + e * 26) + '" y="714">E' + (e + 1) + '</text>';
    }
    s += '</g></g>';

    /* main stream nodes */
    var chips = '';
    for (var c = 0; c < 5; c++) {
      chips += '<rect class="a-tok-box" x="' + (136 + c * 48) + '" y="54" width="42" height="26"/>'
        + '<text class="a-tok-txt" x="' + (157 + c * 48) + '" y="71">' + (c < PROMPT.length ? PROMPT[c] : '…') + '</text>';
    }
    s += '<g class="a-node" data-stage="tokens">'
      + '<rect class="a-box" x="120" y="24" width="320" height="68"/><rect class="a-hit" x="120" y="24" width="320" height="68"/>'
      + '<text class="a-no" x="132" y="42">01</text>'
      + '<text class="a-label-sm" x="156" y="42" data-k="tokens"></text>'
      + '<text class="a-sub" x="424" y="42" text-anchor="end">(B, T) · INT IDS</text>' + chips
      + '<text class="a-upd" x="424" y="84" text-anchor="end">∇</text></g>';

    s += '<g class="a-node" data-stage="embed">'
      + '<rect class="a-box" x="120" y="110" width="320" height="56"/><rect class="a-hit" x="120" y="110" width="320" height="56"/>'
      + '<text class="a-no" x="132" y="132">02</text>'
      + '<text class="a-label" x="156" y="134" data-k="embed"></text>'
      + '<text class="a-sub" x="156" y="150">V → d · LOOKUP TABLE</text>'
      + '<rect class="a-tagbox" x="370" y="123" width="54" height="16"/>'
      + '<text class="a-tag" x="397" y="134" text-anchor="middle">TIED</text>'
      + '<text class="a-upd" x="424" y="158" text-anchor="end">∇</text></g>';

    var layers = '';
    for (var l = 0; l < 4; l++) {
      var ly = 224 + l * 32;
      layers += '<g class="a-layer"><rect class="a-layer-box" x="136" y="' + ly + '" width="288" height="24"/>'
        + '<path class="a-layer-rule" d="M296 ' + ly + 'V' + (ly + 24) + '"/>'
        + '<text class="a-layer-txt" x="148" y="' + (ly + 16) + '">ATTN</text>'
        + '<text class="a-layer-txt" x="312" y="' + (ly + 16) + '">FFN</text>'
        + '<text class="a-layer-no" x="416" y="' + (ly + 16) + '" text-anchor="end">L0' + (l + 1) + '</text></g>';
    }
    s += '<g class="a-node a-stack" data-stage="blocks">'
      + '<rect class="a-box" x="120" y="192" width="320" height="184"/><rect class="a-hit" x="120" y="192" width="320" height="184"/>'
      + '<text class="a-no" x="132" y="210">03</text>'
      + '<text class="a-label" x="156" y="212" data-k="blocks"></text>'
      + '<text class="a-label-xl" x="424" y="216" text-anchor="end">×N</text>'
      + '<g class="a-layers">' + layers + '</g>'
      + '<text class="a-sub" x="280" y="366" text-anchor="middle">IDENTICAL LAYERS · WEIGHTS SHARED</text>'
      + '<text class="a-upd" x="424" y="368" text-anchor="end">∇</text></g>';

    s += '<g class="a-node" data-stage="finalnorm">'
      + '<rect class="a-box" x="120" y="398" width="320" height="56"/><rect class="a-hit" x="120" y="398" width="320" height="56"/>'
      + '<text class="a-no" x="132" y="420">04</text>'
      + '<text class="a-label" x="156" y="422" data-k="finalnorm"></text>'
      + '<text class="a-sub" x="156" y="438">RMSNORM · d · POST-STACK</text>'
      + '<text class="a-upd" x="424" y="446" text-anchor="end">∇</text></g>';

    s += '<g class="a-node" data-stage="lmhead">'
      + '<rect class="a-box" x="120" y="476" width="320" height="56"/><rect class="a-hit" x="120" y="476" width="320" height="56"/>'
      + '<text class="a-no" x="132" y="498">05</text>'
      + '<text class="a-label" x="156" y="500" data-k="lmhead"></text>'
      + '<text class="a-sub" x="156" y="516">d → V · NO BIAS</text>'
      + '<rect class="a-tagbox" x="370" y="489" width="54" height="16"/>'
      + '<text class="a-tag" x="397" y="500" text-anchor="middle">TIED</text>'
      + '<text class="a-upd" x="424" y="524" text-anchor="end">∇</text></g>';

    s += '<g class="a-node" data-stage="logits">'
      + '<rect class="a-box" x="120" y="554" width="320" height="38"/><rect class="a-hit" x="120" y="554" width="320" height="38"/>'
      + '<text class="a-no" x="132" y="577">06</text>'
      + '<text class="a-label-sm" x="156" y="577" data-k="logits"></text>'
      + '<text class="a-sub" x="424" y="577" text-anchor="end">(B, T, V)</text>'
      + '<text class="a-upd" x="424" y="562" text-anchor="end">∇</text></g>';

    s += '<g class="a-node" data-stage="sample">'
      + '<rect class="a-box" x="120" y="592" width="320" height="38"/><rect class="a-hit" x="120" y="592" width="320" height="38"/>'
      + '<text class="a-no" x="132" y="615">07</text>'
      + '<text class="a-label-sm" x="156" y="615" data-k="sample"></text>'
      + '<text class="a-sub" x="424" y="615" text-anchor="end">T · TOP-K · TOP-P</text>'
      + '<text class="a-upd" x="424" y="600" text-anchor="end">∇</text></g>';

    s += '<g class="a-node" data-stage="next">'
      + '<rect class="a-box" x="120" y="652" width="320" height="60"/><rect class="a-hit" x="120" y="652" width="320" height="60"/>'
      + '<text class="a-no" x="132" y="670">08</text>'
      + '<text class="a-label-sm" x="156" y="672" data-k="next"></text>'
      + '<rect class="a-next-box" x="136" y="680" width="58" height="24"/>'
      + '<text class="a-next-tok" x="165" y="696" data-token>—</text>'
      + '<text class="a-sub" x="206" y="696">APPEND · KV +1</text>'
      + '<text class="a-upd" x="424" y="704" text-anchor="end">∇</text></g>';

    /* connectors + loop (drawn over the boxes so the arrowheads touch edges) */
    var wires = '';
    each([[92, 114], [170, 192], [376, 398], [454, 476], [532, 554], [630, 652]], function (p) {
      wires += '<path class="a-wire" d="M280 ' + p[0] + 'V' + p[1] + '" marker-end="url(#a-arr)"/>';
    });
    wires += '<g class="a-zoom-g"><path class="a-zoom" d="M426 236H492"/>'
      + '<circle class="a-dot" cx="426" cy="236" r="2.5"/>'
      + '<text class="a-sub" x="460" y="228" text-anchor="middle">×1</text></g>'
      + '<g class="a-loop-g" data-stage="append">'
      + '<path class="a-loop" d="M280 712V738H70V58H118" marker-end="url(#a-arr-sig)"/>'
      + '<text class="a-loop-label" transform="translate(56 566) rotate(-90)" data-ui="loop"></text>'
      + '</g>'
      + '<g class="a-bp">'
      + '<path class="a-wire a-bp-line" d="M440 682H484V58H442" marker-end="url(#a-arr)"/>'
      + '<text class="a-bp-label" transform="translate(490 320) rotate(-90)" data-ui="backprop"></text>'
      + '</g>';
    return s + wires;
  }

  /* ── html shell ────────────────────────────────────────────────────────── */
  function shellHtml() {
    return '<div class="arch-shell">'
      + '<header class="arch-head">'
      + '<div class="arch-head-main">'
      + '<p class="arch-eyebrow" data-ui="eyebrow"></p>'
      + '<h3 class="arch-title" data-ui="title"></h3>'
      + '<p class="arch-sub" data-ui="sub"></p></div>'
      + '<div class="arch-reads">'
      + '<p class="arch-read"><span data-ui="stage"></span><b data-a="stage">—</b></p>'
      + '<p class="arch-read"><span data-ui="mode"></span><b data-a="mode">—</b></p>'
      + '<p class="arch-read"><span data-ui="pos"></span><b data-a="t">—</b></p></div>'
      + '</header>'
      + '<div class="arch-controls" role="toolbar" aria-label="Diagram controls">'
      + '<button class="a-btn" type="button" dataa="play" aria-pressed="true"><i class="a-led" aria-hidden="true"></i><span data-btn="play"></span></button>'
      + '<button class="a-btn" type="button" dataa="mode" aria-pressed="false"><span data-btn="mode"></span></button>'
      + '<button class="a-btn" type="button" dataa="replay"><span data-btn="replay"></span><em aria-hidden="true">↺</em></button>'
      + '<button class="a-btn" type="button" dataa="moe" aria-pressed="false"><span>MoE</span><em data-ui="optional"></em></button>'
      + '<p class="a-hint" data-ui="hint"></p>'
      + '<div class="a-loss" aria-hidden="true"><span class="a-loss-k" data-ui="loss"></span>'
      + '<svg class="a-loss-svg" viewBox="0 0 132 26"><polyline class="a-loss-poly" points="2,4 30,9 55,8 80,15 105,17 128,23"/>'
      + '<circle class="a-loss-dot" cx="0" cy="0" r="2.4"/></svg>'
      + '<span class="a-loss-v" data-ui="lossDesc"></span></div>'
      + '</div>'
      + '<div class="arch-diagram"></div>'
      + '<div class="arch-detail" aria-live="polite" aria-atomic="true">'
      + '<p class="arch-detail-no" data-a="dno">00</p>'
      + '<div class="arch-detail-body">'
      + '<p class="arch-detail-eyebrow" data-a="den"></p>'
      + '<h4 class="arch-detail-title" data-a="dzh"></h4>'
      + '<p class="arch-detail-desc" data-a="ddesc"></p></div>'
      + '<ul class="arch-detail-meta" data-a="dmeta"></ul>'
      + '</div>'
      + '<div class="arch-aux">'
      + '<section class="arch-block a-mask" aria-label="Causal attention mask, 8 by 8">'
      + '<p class="a-block-head"><span class="a-block-title" data-ui="maskTitle"></span>'
      + '<span class="a-block-sub" data-ui="maskSub"></span></p>'
      + '<div class="a-mask-grid" aria-hidden="true"></div></section>'
      + '<section class="arch-block arch-kv a-kv" data-stage="kv">'
      + '<p class="a-block-head"><span class="a-block-title" data-ui="kvTitle"></span>'
      + '<span class="a-block-sub" data-ui="kvSub"></span></p>'
      + '<div class="a-kv-chips"></div>'
      + '<p class="a-kv-read"><span>T</span> <b data-a="t2">—</b> <span data-ui="grows"></span></p></section>'
      + '<section class="arch-block a-trains">'
      + '<p class="a-block-head"><span class="a-block-title" data-ui="trainTitle"></span>'
      + '<span class="a-block-sub" data-ui="trainSub"></span></p>'
      + '<div class="a-train-chips"></div></section>'
      + '</div></div>';
  }

  function apiNoop() {
    var f = function () {};
    return { setLang: f, setTheme: f, pause: f, resume: f, dispose: f };
  }

  /* ── instance ──────────────────────────────────────────────────────────── */
  function create(rootEl, opts) {
    var listeners = [];
    function on(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      listeners.push([target, type, fn, options]);
    }
    function offAll() {
      each(listeners, function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      listeners.length = 0;
    }

    var docEl = document.documentElement;
    var media = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var lang = opts.lang === 'en' ? 'en' : (opts.lang === 'zh' ? 'zh' : (docEl.lang === 'en' ? 'en' : 'zh'));
    var reduce = opts.reduce != null ? !!opts.reduce : !!(media && media.matches);
    var theme = opts.theme === 'light' ? 'light' : 'dark';

    var train = false, hasMoe = false, playing = !reduce, visible = true, narrow = false;
    var steps = STEPS_FWD, stepIdx = 0, startTs = 0, raf = 0;
    var io = null, ro = null;
    var liveEls = [], selectedKey = 'overview', pinKey = null, hoverKey = null;
    var kv = PROMPT.slice(), kvPos = kv.length, sampleIdx = 0, sampled = '', maskRow = -1;
    var addedRootClass = !rootEl.classList.contains('arch-root');
    var addedLang = !rootEl.hasAttribute('lang');

    rootEl.classList.add('arch-root');
    if (addedLang) { rootEl.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN'); }
    rootEl.setAttribute('data-arch-theme', theme);
    rootEl.classList.toggle('is-reduce', reduce);
    rootEl.classList.toggle('is-narrow', false);
    rootEl.insertAdjacentHTML('beforeend', shellHtml());

    var shell = q(rootEl, '.arch-shell');
    var diagram = q(shell, '.arch-diagram');
    diagram.innerHTML = '<svg class="arch-svg" viewBox="' + FULL_VB + '" role="img" preserveAspectRatio="xMidYMid meet">'
      + '<title data-ui="svgTitle"></title>' + svgMarkup() + '</svg>';
    var svg = q(diagram, 'svg');

    var refs = {
      stage: q(shell, '[data-a="stage"]'), mode: q(shell, '[data-a="mode"]'),
      t: q(shell, '[data-a="t"]'), t2: q(shell, '[data-a="t2"]'),
      dno: q(shell, '[data-a="dno"]'), den: q(shell, '[data-a="den"]'),
      dzh: q(shell, '[data-a="dzh"]'), ddesc: q(shell, '[data-a="ddesc"]'),
      dmeta: q(shell, '[data-a="dmeta"]'),
      maskGrid: q(shell, '.a-mask-grid'), kvChips: q(shell, '.a-kv-chips'),
      trainChips: q(shell, '.a-train-chips'),
      nextTok: q(shell, '[data-token]')
    };
    var btns = {
      play: q(shell, '[dataa="play"]'), mode: q(shell, '[dataa="mode"]'),
      replay: q(shell, '[dataa="replay"]'), moe: q(shell, '[dataa="moe"]')
    };

    /* mask matrix 8×8, upper triangle hatched */
    var mHtml = '';
    for (var mr = 0; mr < 8; mr++) {
      mHtml += '<div class="a-mask-row" data-row="' + mr + '"><span class="a-mask-no">' + pad(mr + 1, 2) + '</span>';
      for (var mc = 0; mc < 8; mc++) { mHtml += '<i class="a-mask-cell' + (mc > mr ? ' is-mask' : '') + '"></i>'; }
      mHtml += '</div>';
    }
    refs.maskGrid.innerHTML = mHtml;
    var maskRows = refs.maskGrid.querySelectorAll('.a-mask-row');

    /* training stage chips */
    var tHtml = '';
    each(TRAIN_KEYS, function (k, i) {
      if (i) { tHtml += '<span class="a-sep" aria-hidden="true">→</span>'; }
      tHtml += '<button class="a-chip" type="button" data-stage="' + k + '"><b>' + pad(i + 1, 2) + '</b>'
        + '<span data-k="' + k + '"></span></button>';
    });
    refs.trainChips.innerHTML = tHtml;

    function setTexts() {
      each(rootEl.querySelectorAll('[data-k]'), function (n) {
        var k = n.getAttribute('data-k');
        if (COPY[k]) { n.textContent = COPY[k][lang]; }
      });
      each(rootEl.querySelectorAll('[data-ui]'), function (n) {
        var k = n.getAttribute('data-ui');
        if (UI[lang][k]) { n.textContent = UI[lang][k]; }
      });
      svg.setAttribute('aria-label', UI[lang].svgLabel);
      each(rootEl.querySelectorAll('.a-chip'), function (n) {
        var k = n.getAttribute('data-stage');
        if (COPY[k]) { n.setAttribute('aria-label', COPY[k].en + ' / ' + COPY[k].zh); }
      });
    }

    function syncControls() {
      var u = UI[lang];
      btns.play.setAttribute('aria-pressed', playing ? 'true' : 'false');
      btns.play.setAttribute('aria-label', playing ? u.pauseAria : u.playAria);
      q(btns.play, '[data-btn="play"]').textContent = playing ? u.pause : u.play;
      btns.mode.setAttribute('aria-pressed', train ? 'true' : 'false');
      btns.mode.setAttribute('aria-label', u.modeAria);
      q(btns.mode, '[data-btn="mode"]').textContent = u.modeTrain;
      btns.replay.setAttribute('aria-label', u.replayAria);
      q(btns.replay, '[data-btn="replay"]').textContent = u.replay;
      btns.moe.setAttribute('aria-pressed', hasMoe ? 'true' : 'false');
      btns.moe.setAttribute('aria-label', u.moeAria);
      refs.mode.textContent = train ? u.train : u.fwd;
    }

    function renderDetail(key) {
      var e = COPY[key] || COPY.overview;
      selectedKey = COPY[key] ? key : 'overview';
      refs.dno.textContent = e.no || '00';
      refs.den.textContent = e.en;
      refs.dzh.textContent = e.zh;
      refs.ddesc.textContent = lang === 'en' ? e.dEn : e.dZh;
      var h = '', m = e.meta || [];
      for (var i = 0; i < m.length; i++) { h += '<li>' + m[i] + '</li>'; }
      refs.dmeta.innerHTML = h;
    }

    function applyLang() {
      setTexts();
      syncControls();
      renderDetail(selectedKey);
    }

    function setLive(ids) {
      each(liveEls, function (n) { n.classList.remove('is-live'); });
      liveEls = [];
      each(ids || [], function (id) {
        each(rootEl.querySelectorAll('[data-stage="' + id + '"]'), function (n) {
          n.classList.add('is-live'); liveEls.push(n);
        });
      });
    }

    function setMask(r) {
      each(maskRows, function (n) { n.classList.remove('is-on'); });
      if (r >= 0 && maskRows[r]) { maskRows[r].classList.add('is-on'); }
    }
    function clearMask() { setMask(-1); }

    function updateT() {
      refs.t.textContent = pad(kvPos, 3);
      refs.t2.textContent = pad(kvPos, 3);
    }

    function renderKv(newIdx) {
      var base = kvPos - kv.length + 1, html = '';
      for (var i = 0; i < kv.length; i++) {
        html += '<span class="a-kv-chip' + (i === newIdx ? ' is-new' : '') + '"><em>'
          + pad(base + i, 3) + '</em>' + esc(kv[i]) + '</span>';
      }
      refs.kvChips.innerHTML = html;
      updateT();
    }

    function setToken(t) {
      sampled = t;
      refs.nextTok.textContent = t;
    }

    function canRun() { return playing && visible && !document.hidden; }

    function frame(ts) {
      raf = 0;
      if (!canRun()) { return; }
      if (!startTs) { startTs = ts; }
      if (ts - startTs >= steps[stepIdx].d) {
        startTs = ts;
        applyStep((stepIdx + 1) % steps.length, true);
      }
      raf = global.requestAnimationFrame(frame);
    }

    function syncLoop() {
      rootEl.classList.toggle('is-playing', playing);
      if (canRun() && !raf) { startTs = 0; raf = global.requestAnimationFrame(frame); }
      else if (!canRun() && raf) { global.cancelAnimationFrame(raf); raf = 0; }
    }

    function applyStep(i, sideEffects) {
      stepIdx = i;
      var st = steps[i];
      var hl = (st.hl || [st.k]).slice();
      if (train) {
        hl = hl.filter(function (x) { return x !== 'kv'; });
        if (st.k === 'append') { hl.push('next'); }
      }
      setLive(hl);
      refs.stage.textContent = pad(i + 1, 2) + '/' + pad(steps.length, 2);
      if (!sideEffects || train) { return; }
      if (st.k === 'sample') {
        setToken(SAMPLE_WORDS[sampleIdx % SAMPLE_WORDS.length]);
        sampleIdx++;
      } else if (st.k === 'append') {
        if (sampled) {
          kv.push(sampled);
          kvPos += 1;
          if (kv.length > MAX_KV) { kv.shift(); }
          renderKv(kv.length - 1);
        }
        maskRow = (maskRow + 1) % 8;
        setMask(maskRow);
      }
    }

    function restart(clearCache) {
      steps = train ? STEPS_BACK : STEPS_FWD;
      stepIdx = 0; startTs = 0;
      if (clearCache) {
        kv = PROMPT.slice(); kvPos = kv.length; sampleIdx = 0;
        sampled = ''; refs.nextTok.textContent = '—';
        renderKv(-1);
      }
      if (train) { clearMask(); } else { maskRow = -1; setMask(0); }
      applyStep(0, false);
      refs.stage.textContent = pad(1, 2) + '/' + pad(steps.length, 2);
    }

    function staticReset() {
      playing = false; stepIdx = 0; startTs = 0;
      steps = train ? STEPS_BACK : STEPS_FWD;
      setLive([]);
      clearMask();
      kv = PROMPT.slice(); kvPos = kv.length; sampled = '';
      refs.nextTok.textContent = '—';
      renderKv(-1);
      refs.stage.textContent = '—';
      syncControls();
      syncLoop();
    }

    function setTrain(v) {
      train = !!v;
      rootEl.classList.toggle('is-train', train);
      steps = train ? STEPS_BACK : STEPS_FWD;
      stepIdx = 0; startTs = 0;
      if (train) { clearMask(); } else { maskRow = -1; setMask(0); }
      applyStep(0, false);
      syncControls();
      syncLoop();
    }

    function setMoe(v) {
      hasMoe = !!v;
      rootEl.classList.toggle('has-moe', hasMoe);
      each(rootEl.querySelectorAll('.a-expert'), function (n, i) {
        n.classList.toggle('is-top', hasMoe && i === 0);
      });
      syncControls();
    }

    function highlightSel(key) {
      each(rootEl.querySelectorAll('.is-sel'), function (n) { n.classList.remove('is-sel'); });
      if (!key) { return; }
      each(rootEl.querySelectorAll('[data-stage="' + key + '"]'), function (n) { n.classList.add('is-sel'); });
    }

    /* ── bindings ───────────────────────────────────────────────────────── */
    each(rootEl.querySelectorAll('[data-stage]'), function (el) {
      var key = el.getAttribute('data-stage');
      var isBtn = el.tagName.toLowerCase() === 'button';
      on(el, 'pointerenter', function () {
        if (isBtn) { return; }
        hoverKey = key; renderDetail(key);
      });
      on(el, 'pointerleave', function () {
        if (isBtn) { return; }
        hoverKey = null; renderDetail(pinKey || 'overview');
      });
      on(el, 'click', function () {
        pinKey = key; highlightSel(key); renderDetail(key);
        if (key === 'moe') { setMoe(!hasMoe); }
      });
      if (isBtn) {
        on(el, 'focus', function () { hoverKey = key; renderDetail(key); });
        on(el, 'blur', function () { hoverKey = null; renderDetail(pinKey || 'overview'); });
      }
    });

    on(btns.play, 'click', function () {
      playing = !playing;
      startTs = 0;
      syncControls(); syncLoop();
    });
    on(btns.mode, 'click', function () { setTrain(!train); });
    on(btns.replay, 'click', function () {
      playing = true; startTs = 0;
      restart(true);
      syncControls(); syncLoop();
    });
    on(btns.moe, 'click', function () { setMoe(!hasMoe); });

    function updateNarrow() {
      var w = rootEl.clientWidth || rootEl.getBoundingClientRect().width || 0;
      var n = w > 0 && w < 720;
      if (n === narrow) { return; }
      narrow = n;
      rootEl.classList.toggle('is-narrow', narrow);
      svg.setAttribute('viewBox', narrow ? NARROW_VB : FULL_VB);
    }
    on(global, 'resize', updateNarrow);

    if ('IntersectionObserver' in global) {
      io = new IntersectionObserver(function (entries) {
        visible = !!(entries[0] && entries[0].isIntersecting);
        syncLoop();
      }, { threshold: 0.02 });
      io.observe(rootEl);
    }
    if ('ResizeObserver' in global) {
      ro = new ResizeObserver(function () { updateNarrow(); });
      ro.observe(rootEl);
    }
    on(document, 'visibilitychange', syncLoop);

    if (media && media.addEventListener) {
      on(media, 'change', function (e) {
        reduce = !!e.matches;
        rootEl.classList.toggle('is-reduce', reduce);
        if (reduce) { staticReset(); }
      });
    }

    /* ── init ───────────────────────────────────────────────────────────── */
    updateNarrow();
    applyLang();
    renderKv(-1);
    if (reduce) {
      staticReset();
    } else {
      restart(false);
      syncControls();
      syncLoop();
    }
    setMoe(false);

    /* ── public methods ─────────────────────────────────────────────────── */
    function dispose() {
      offAll();
      if (raf) { global.cancelAnimationFrame(raf); raf = 0; }
      if (io) { io.disconnect(); io = null; }
      if (ro) { ro.disconnect(); ro = null; }
      if (shell && shell.parentNode) { shell.parentNode.removeChild(shell); }
      if (addedRootClass) { rootEl.classList.remove('arch-root'); }
      rootEl.classList.remove('is-train', 'has-moe', 'is-reduce', 'is-narrow', 'is-playing');
      rootEl.removeAttribute('data-arch-theme');
      if (addedLang) { rootEl.removeAttribute('lang'); }
      if (rootEl.__goldenArchDispose === dispose) { delete rootEl.__goldenArchDispose; }
    }

    return {
      api: {
        setLang: function (v) {
          lang = v === 'en' ? 'en' : 'zh';
          if (addedLang) { rootEl.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN'); }
          applyLang();
        },
        setTheme: function (v) {
          theme = v === 'light' ? 'light' : 'dark';
          rootEl.setAttribute('data-arch-theme', theme);
        },
        pause: function () { playing = false; startTs = 0; syncControls(); syncLoop(); },
        resume: function () { playing = true; syncControls(); syncLoop(); },
        dispose: dispose
      },
      dispose: dispose
    };
  }

  function mount(rootEl, opts) {
    if (!rootEl || rootEl.nodeType !== 1) { return apiNoop(); }
    if (typeof rootEl.__goldenArchDispose === 'function') {
      try { rootEl.__goldenArchDispose(); } catch (e) { /* ignore */ }
    }
    var inst = create(rootEl, opts || {});
    rootEl.__goldenArchDispose = inst.dispose;
    return inst.api;
  }

  global.GoldenArch = { mount: mount };
})(window);
