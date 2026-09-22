"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, Coins, Flag, Heart, Home, ImageOff, PawPrint, Search, ShieldCheck, Sparkles, Store, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { communityPosts, furniture, petArtPath, pets, questions, type PetEntry } from "@/lib/pet-data";

type MyPet = { templateId: string; name: string; stage: number; coat: string };
type SavedState = {
  points: number;
  pet: MyPet | null;
  answered: Record<string, number>;
  inventory: string[];
  placed: (string | null)[];
  weights: { value: number; date: string }[];
};

type Viewer = { signedIn: boolean; displayName: string };
type CommunityPost = { id: string; category: string; petId: string | null; title: string; author: string; content: string; status: string; professional: boolean; createdAt: string };
type ApiPayload = { revision?: number; profile?: Partial<SavedState>; points?: number; answered?: Record<string, number>; inventory?: string[]; placements?: { itemId: string; slot: number }[]; viewer?: Viewer; posts?: CommunityPost[]; offline?: boolean; error?: string; post?: CommunityPost; choice?: number; correct?: boolean; explanation?: string };

const initialState: SavedState = { points: 0, pet: null, answered: {}, inventory: [], placed: Array<string | null>(9).fill(null), weights: [] };
const groups = ["全部", "犬", "猫", "小型哺乳", "爬宠", "无脊椎"];
const readApi = (response: Response) => response.json() as Promise<ApiPayload>;

function getGuestId() {
  let id = localStorage.getItem("pet-guide-guest");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("pet-guide-guest", id);
  }
  return id;
}

export default function PetGuide() {
  const [tab, setTab] = useState("catalog");
  const [state, setState] = useState<SavedState>(initialState);
  const revision = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState("正在读取档案");
  const [viewer, setViewer] = useState<Viewer>({ signedIn: false, displayName: "体验用户" });
  const [posts, setPosts] = useState<CommunityPost[]>(communityPosts);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/bootstrap", { headers: { "x-pet-guest": getGuestId() } })
      .then(readApi)
      .then((data) => {
        const local = localStorage.getItem("pet-guide-state");
        const profile = data.revision ? data.profile : local ? JSON.parse(local) : initialState;
        const placed = Array<string | null>(9).fill(null);
        for (const item of data.placements ?? []) if (item.slot >= 0 && item.slot < 9) placed[item.slot] = item.itemId;
        setState({ ...initialState, ...profile, points: data.points ?? 0, answered: data.answered ?? {}, inventory: data.inventory ?? [], placed });
        setViewer(data.viewer ?? { signedIn: false, displayName: "体验用户" });
        setPosts([...(data.posts ?? []), ...communityPosts.filter((sample) => !(data.posts ?? []).some((post) => post.id === sample.id))]);
        revision.current = data.revision ?? 0;
        setSync(data.offline ? "本地体验模式" : "档案已同步");
      })
      .catch(() => {
        const local = localStorage.getItem("pet-guide-state");
        if (local) setState({ ...initialState, ...JSON.parse(local) });
        setSync("本地体验模式");
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const profile = { pet: state.pet, weights: state.weights };
    localStorage.setItem("pet-guide-state", JSON.stringify(profile));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-pet-guest": getGuestId() },
        body: JSON.stringify({ state: profile, revision: revision.current }),
      })
        .then(readApi)
        .then((data) => {
          if (data.revision) revision.current = data.revision;
          setSync(data.error ? "已保存在本设备" : "档案已同步");
        })
        .catch(() => setSync("已保存在本设备"));
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state.pet, state.weights, loaded]);

  const patchState = (change: Partial<SavedState>) => setState((current) => ({ ...current, ...change }));

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab("catalog")} aria-label="返回宠物图鉴">
          <span className="brand-mark"><PawPrint /></span>
          <span><b>爪爪图鉴</b><small>PET FIELD NOTES</small></span>
        </button>
        <div className="status-pill"><span className="status-dot" />{sync}</div>
        <div className="point-pill"><Coins /> <b>{state.points}</b><span>成长点</span></div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="main-tabs">
        <TabsList className="desktop-nav" variant="line">
          <TabsTrigger value="catalog"><Search />图鉴</TabsTrigger>
          <TabsTrigger value="community"><Users />社区</TabsTrigger>
          <TabsTrigger value="learn"><BookOpen />学习</TabsTrigger>
          <TabsTrigger value="home"><Home />家园</TabsTrigger>
          <TabsTrigger value="me"><PawPrint />我的</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog"><Catalog posts={posts} onCreate={(pet) => { patchState({ pet }); setTab("me"); }} /></TabsContent>
        <TabsContent value="community"><Community viewer={viewer} posts={posts} setPosts={setPosts} /></TabsContent>
        <TabsContent value="learn"><Learn state={state} patchState={patchState} /></TabsContent>
        <TabsContent value="home"><PetHome state={state} patchState={patchState} goLearn={() => setTab("learn")} /></TabsContent>
        <TabsContent value="me"><MyPets state={state} patchState={patchState} openCatalog={() => setTab("catalog")} /></TabsContent>
      </Tabs>

      <nav className="mobile-nav" aria-label="主要导航">
        {[["catalog","图鉴",Search],["community","社区",Users],["learn","学习",BookOpen],["home","家园",Home],["me","我的",PawPrint]].map(([id,label,Icon]) => {
          const NavIcon = Icon as typeof Search;
          return <button key={id as string} className={tab === id ? "active" : ""} onClick={() => setTab(id as string)}><NavIcon /><span>{label as string}</span></button>;
        })}
      </nav>
    </div>
  );
}

function ArtSlot({ path, label, compact = false }: { path: string; label: string; compact?: boolean }) {
  return <div className={`asset-slot ${compact ? "compact" : ""}`}><ImageOff /><b>{label}</b><small>待提供：{path}</small></div>;
}

function Catalog({ onCreate, posts }: { onCreate: (pet: MyPet) => void; posts: CommunityPost[] }) {
  const [group, setGroup] = useState("全部");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PetEntry>(pets[0]);
  const [stage, setStage] = useState(0);
  const matches = useMemo(() => pets.filter((pet) => (group === "全部" || pet.group === group) && `${pet.name}${pet.latin ?? ""}`.toLowerCase().includes(query.toLowerCase())), [group, query]);
  return (
    <main className="page catalog-page">
      <section className="catalog-intro">
        <div><span className="eyebrow">可靠资料 · 持续更新</span><h1>从认识它开始，<br /><em>更好地陪伴它。</em></h1></div>
        <div className="search-box"><Search /><input aria-label="搜索宠物" placeholder="搜索品种、别名或学名" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </section>
      <div className="filter-row">{groups.map((item) => <button key={item} className={group === item ? "active" : ""} onClick={() => setGroup(item)}>{item}</button>)}</div>
      <section className="catalog-grid">
        <div className="pet-list">
          <div className="list-heading"><h2>已收录 {matches.length} 种伙伴</h2><span>资料不足时会明确标注</span></div>
          <div className="pet-cards">{matches.map((pet) => (
            <button key={pet.id} className={`pet-card ${selected.id === pet.id ? "selected" : ""}`} onClick={() => { setSelected(pet); setStage(0); }}>
              <span className="pet-emoji" style={{ background: pet.accent }}>{pet.emoji}</span>
              <span><b>{pet.name}</b><small>{pet.group} · {pet.size}</small></span><ChevronRight />
            </button>
          ))}</div>
          {!matches.length && <div className="empty-card">暂未找到对应伙伴。试试搜索常用名称，或切换分类。</div>}
        </div>
        <article className="pet-detail">
          <div className="art-stage"><ArtSlot path={petArtPath(selected.id, stage)} label={`${selected.name} · ${selected.stages[stage]}像素形象`} /></div>
          <div className="detail-body">
            <div className="detail-title"><div><span>{selected.group} · {selected.size}</span><h2>{selected.name}</h2><small>{selected.latin}</small></div><button aria-label="收藏"><Heart /></button></div>
            <div className="stage-switch">{selected.stages.map((item, index) => <button key={item} className={stage === index ? "active" : ""} onClick={() => setStage(index)}>{item}</button>)}</div>
            <div className="metric-row"><div><small>参考体重</small><b>{selected.weight}</b></div><div><small>当前展示</small><b>{selected.stages[stage]}</b></div></div>
            <div className="trait-row">{selected.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
            <p>{selected.care}</p><div className="fit-note"><Sparkles /><span><small>更适合</small>{selected.fit}</span></div>
            <Button className="primary-action" onClick={() => onCreate({ templateId: selected.id, name: selected.name.slice(0, 2), stage, coat: "经典" })}>创建我的像素伙伴</Button>
            <div className="experience-preview"><h3>大家的饲养经验</h3>{posts.filter((post) => post.petId === selected.id && post.status === "approved").slice(0, 2).map((post) => <div key={post.id}><b>{post.title}</b><small>{post.author}</small></div>)}{!posts.some((post) => post.petId === selected.id && post.status === "approved") && <p>暂时还没有公开经验，可以去社区提交第一篇。</p>}</div>
          </div>
        </article>
      </section>
    </main>
  );
}

function Community({ viewer, posts, setPosts }: { viewer: Viewer; posts: CommunityPost[]; setPosts: (posts: CommunityPost[]) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "饲养经验", petId: "", title: "", content: "" });
  const [message, setMessage] = useState("");
  const report = async (postId: string) => {
    const response = await fetch("/api/community/report", { method: "POST", headers: { "content-type": "application/json", "x-pet-guest": getGuestId() }, body: JSON.stringify({ postId, reason: "用户标记为可能包含不当或不准确信息" }) });
    const data = await readApi(response);
    setMessage(response.ok ? "举报已提交，等待审核处理" : data.error ?? "举报提交失败");
  };
  const submit = async () => {
    setMessage("正在提交");
    const response = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json", "x-pet-guest": getGuestId() }, body: JSON.stringify({ ...form, petId: form.petId || null }) });
    const data = await readApi(response);
    if (!response.ok) return setMessage(data.error ?? "提交失败");
    if (!data.post) return setMessage("服务未返回投稿内容");
    setPosts([data.post, ...posts]);
    setMessage(""); setOpen(false); setForm({ category: "饲养经验", petId: "", title: "", content: "" });
  };
  return <main className="page"><div className="section-header"><div><span className="eyebrow">真实经验 · 先审后发</span><h1>社区</h1></div>{viewer.signedIn ? <Button onClick={() => setOpen(true)}>发布经验</Button> : <Button asChild><a href="/signin-with-chatgpt?return_to=%2F">登录后发布</a></Button>}</div>
    <div className="notice"><ShieldCheck /><span><b>身份认证与内容审核分别展示。</b>普通经验不会被包装成专业意见；诊疗内容只有在作者认证和内容审核都完成后才显示专业标识。</span></div>
    {message && !open && <div className="inline-message">{message}</div>}<div className="community-layout"><section className="post-list">{posts.map((post) => <article className="post-card" key={post.id}><div className="post-badges"><span className="post-tag">{post.category}</span>{post.status === "pending" && <span className="pending-tag">仅自己可见 · 待审核</span>}{post.professional && post.status === "approved" && <span className="pro-tag"><UserCheck />专业内容</span>}</div><h2>{post.title}</h2><p>{post.content}</p><footer><span><b>{post.author}</b><small>{post.petId ? `关联：${pets.find((pet) => pet.id === post.petId)?.name ?? "宠物"}` : "未关联品种"}</small></span>{post.status === "approved" && !post.id.startsWith("demo-") && <button className="report-button" title="举报内容" onClick={() => report(post.id)}><Flag /> 举报</button>}</footer></article>)}</section>
    <aside className="coming-card"><Users /><h3>社区规则</h3><p>首版支持文字经验、用品体会、领养信息和诊疗经历。提交后先进入待审核状态；请勿公开电话号码、住址、证件或完整病历。</p><div><span>饲养经验</span><span>用品推荐</span><span>领养信息</span><span>诊疗经验</span></div></aside></div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>发布一条经验</DialogTitle><DialogDescription>内容会先进入待审核状态，审核通过后所有人可见。</DialogDescription></DialogHeader><div className="post-form"><label>分类<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>饲养经验</option><option>用品推荐</option><option>领养信息</option><option>诊疗经验</option></select></label><label>关联宠物（可选）<select value={form.petId} onChange={(event) => setForm({ ...form, petId: event.target.value })}><option value="">不关联</option>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select></label><label>标题<Input value={form.title} maxLength={60} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="用一句话说清经验" /></label><label>正文<Textarea value={form.content} maxLength={2000} rows={7} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="说明宠物情况、做法、结果和限制，至少 20 字" /></label>{message && <p className="form-message">{message}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>取消</Button><Button onClick={submit}>提交审核</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}

function Learn({ state, patchState }: { state: SavedState; patchState: (c: Partial<SavedState>) => void }) {
  const [groupIndex, setGroupIndex] = useState(0);
  const group = questions.slice(groupIndex * 5, groupIndex * 5 + 5);
  const answeredInGroup = group.filter((question) => state.answered[question.id] !== undefined).length;
  const current = group.find((question) => state.answered[question.id] === undefined);
  const [feedback, setFeedback] = useState<{ question: typeof questions[number]; choice: number; correct: boolean; explanation: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const answer = async (index: number) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/quiz/answer", { method: "POST", headers: { "content-type": "application/json", "x-pet-guest": getGuestId() }, body: JSON.stringify({ questionId: current.id, choice: index }) });
      const data = await readApi(response);
      if (!response.ok) throw new Error(data.error ?? "答案保存失败");
      if (data.choice === undefined || data.points === undefined || data.correct === undefined || !data.explanation) throw new Error("答题结果不完整");
      patchState({ answered: { ...state.answered, [current.id]: data.choice }, points: data.points });
      setFeedback({ question: current, choice: data.choice, correct: data.correct, explanation: data.explanation });
    } catch (error) { setFeedback({ question: current, choice: index, correct: false, explanation: error instanceof Error ? error.message : "答案暂时无法保存" }); }
    finally { setBusy(false); }
  };
  const allDone = Object.keys(state.answered).length >= questions.length;
  return <main className="page learn-page"><section className="learn-sidebar"><span className="eyebrow">知识练习</span><h1>{answeredInGroup === group.length ? "这一组完成了" : "每次 5 题，慢慢成为更好的饲主"}</h1><Progress value={answeredInGroup * 20} /><p>本组完成 {answeredInGroup}/5 · 题库共 {questions.length} 题</p><div className="reward-preview"><Coins /><span><b>每日完成奖励 +5</b><small>首次答对每题另得 +2 成长点，由本地服务结算</small></span></div><h3>学习主题</h3>{["养宠前准备","体况与健康","行为沟通","异宠环境"].map((x, i) => <div className="topic" key={x}><span>{i + 1}</span><b>{x}</b><small>可学习</small></div>)}</section>
    <section className="quiz-card">{feedback ? <div className="quiz-feedback"><span className={feedback.correct ? "result-icon right" : "result-icon"}>{feedback.correct ? "✓" : "!"}</span><span className="eyebrow">{feedback.correct ? "回答正确 · 首次可得 2 成长点" : "本题解析"}</span><h2>{feedback.question.text}</h2><p>{feedback.explanation}</p><Button onClick={() => setFeedback(null)}>继续</Button></div> : !current ? <div className="quiz-done"><span>🏆</span><h2>{allDone ? "30 道题全部完成" : "本组练习完成"}</h2><p>成长点已经写入本地账本，可以用来兑换家园装饰。重复打开页面不会重复发放。</p>{!allDone && <Button onClick={() => setGroupIndex((value) => Math.min(5, value + 1))}>进入下一组</Button>}</div> : <><div className="quiz-top"><span>{current.topic}</span><small>本组第 {answeredInGroup + 1} / 5 题</small></div><h2>{current.text}</h2><div className="answers">{current.options.map((option, index) => <button key={option} disabled={busy} onClick={() => answer(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div></>}</section>
  </main>;
}

function PetHome({ state, patchState, goLearn }: { state: SavedState; patchState: (c: Partial<SavedState>) => void; goLearn: () => void }) {
  const pet = pets.find((item) => item.id === state.pet?.templateId);
  const [homeMessage, setHomeMessage] = useState("");
  const buy = async (id: string) => {
    const response = await fetch("/api/furniture/redeem", { method: "POST", headers: { "content-type": "application/json", "x-pet-guest": getGuestId() }, body: JSON.stringify({ itemId: id }) });
    const data = await readApi(response);
    if (!response.ok) return setHomeMessage(data.error ?? "兑换失败");
    if (data.points === undefined) return setHomeMessage("服务未返回成长点余额");
    patchState({ points: data.points, inventory: state.inventory.includes(id) ? state.inventory : [...state.inventory, id] }); setHomeMessage("家具已加入仓库");
  };
  const savePlacement = async (placed: (string | null)[]) => {
    const placements = placed.flatMap((itemId, slot) => itemId ? [{ itemId, slot }] : []);
    const response = await fetch("/api/home", { method: "PUT", headers: { "content-type": "application/json", "x-pet-guest": getGuestId() }, body: JSON.stringify({ placements }) });
    const data = await readApi(response);
    if (!response.ok) return setHomeMessage(data.error ?? "布局保存失败");
    if (!data.placements) return setHomeMessage("服务未返回家园布局");
    const slots = Array<string | null>(9).fill(null);
    for (const item of data.placements) slots[item.slot] = item.itemId;
    patchState({ placed: slots }); setHomeMessage("家园已保存");
  };
  const toggle = (id: string) => {
    if (state.placed.includes(id)) return savePlacement(state.placed.map((item) => item === id ? null : item));
    const openSlot = state.placed.findIndex((item) => item === null);
    if (openSlot < 0) return setHomeMessage("九个格子都已使用，请先收起一件家具");
    const next = [...state.placed]; next[openSlot] = id; return savePlacement(next);
  };
  const clearSlot = (slot: number) => { const next = [...state.placed]; next[slot] = null; return savePlacement(next); };
  return <main className="page home-page"><div className="section-header"><div><span className="eyebrow">像素伙伴的专属空间</span><h1>{state.pet ? `${state.pet.name}的小家` : "先领一位伙伴回家"}</h1></div><div className="point-pill large"><Coins /><b>{state.points}</b><span>可用成长点</span></div></div>
    {!pet || !state.pet ? <section className="empty-home"><Home /><h2>家园还没有主人</h2><p>从图鉴选择一种宠物，创建你的像素伙伴后就能布置家园。</p></section> : <div className="home-layout"><section className="pixel-room"><div className="room-window"><span>✦</span><span>☾</span></div><div className="room-title"><b>{state.pet.name}</b><small>{pet.name} · {pet.stages[state.pet.stage]}</small></div><div className="home-pet"><ArtSlot path={petArtPath(pet.id, state.pet.stage)} label={`${state.pet.name}的像素形象`} compact /></div><div className="placed-items" aria-label="九格家园布局">{state.placed.map((id, index) => { const item = furniture.find((x) => x.id === id); return <button key={index} className={item ? "occupied" : ""} title={item ? `收起${item.name}` : `空格 ${index + 1}`} onClick={item ? () => clearSlot(index) : undefined} disabled={!item}>{item ? <ArtSlot path={item.asset} label={item.name} compact /> : <span>{index + 1}</span>}</button>; })}</div><div className="room-floor" /></section>
      <aside className="shop-panel"><span className="eyebrow"><Store /> 成长点商店</span><h2>把学到的知识，变成家的样子</h2><p>答题获得成长点。已拥有的家具可以放入 9 个格子之一，当前 MVP 按格子顺序保存。</p>{homeMessage && <div className="inline-message">{homeMessage}</div>}<div className="shop-list">{furniture.map((item) => { const owned = state.inventory.includes(item.id); const placed = state.placed.includes(item.id); return <div className="shop-item" key={item.id}><span style={{ background: item.color }}><ImageOff /></span><div><b>{item.name}</b><small>{owned ? placed ? "正在家园中" : "已拥有" : `${item.cost} 成长点`}</small></div><Button size="sm" variant={owned ? "outline" : "default"} disabled={!owned && state.points < item.cost} onClick={() => owned ? toggle(item.id) : buy(item.id)}>{owned ? placed ? "收起" : "摆放" : "兑换"}</Button></div>; })}</div><Button variant="outline" onClick={goLearn}><BookOpen />去学习赚成长点</Button></aside></div>}
  </main>;
}

function MyPets({ state, patchState, openCatalog }: { state: SavedState; patchState: (c: Partial<SavedState>) => void; openCatalog: () => void }) {
  const [weight, setWeight] = useState("");
  const pet = pets.find((item) => item.id === state.pet?.templateId);
  if (!state.pet || !pet) return <main className="page"><section className="empty-profile"><PawPrint /><span className="eyebrow">我的伙伴</span><h1>建立第一张宠物档案</h1><p>从图鉴挑选原型，再为它取名。档案会保存到你的设备和个人账户。</p><Button onClick={openCatalog}>去图鉴选择</Button></section></main>;
  const addWeight = () => { const value = Number(weight); if (!Number.isFinite(value) || value <= 0 || value > 200) return; patchState({ weights: [...state.weights, { value, date: new Date().toISOString().slice(0, 10) }].slice(-12) }); setWeight(""); };
  return <main className="page"><div className="profile-grid"><section className="profile-hero"><div className="profile-art"><ArtSlot path={petArtPath(pet.id, state.pet.stage)} label={`${state.pet.name}像素形象`} /></div><span className="eyebrow">我的像素伙伴</span><input className="pet-name-input" aria-label="宠物昵称" value={state.pet.name} onChange={(event) => patchState({ pet: { ...state.pet!, name: event.target.value.slice(0, 12) } })} /><p>{pet.name} · {pet.traits.join(" / ")}</p><div className="stage-switch">{pet.stages.map((label, index) => <button key={label} className={state.pet?.stage === index ? "active" : ""} onClick={() => patchState({ pet: { ...state.pet!, stage: index } })}>{label}</button>)}</div></section>
    <section className="health-panel"><span className="eyebrow">健康观察记录</span><h2>体重是线索，体况更重要</h2><p>犬猫建议结合 9 分制体况评分（BCS）观察肋骨触感、腰线和腹部轮廓。本页只帮助连续记录，不能替代兽医诊疗。</p><div className="weight-form"><label><span>本次体重（kg）</span><input inputMode="decimal" placeholder="例如 4.8" value={weight} onChange={(event) => setWeight(event.target.value)} /></label><Button onClick={addWeight}>记录</Button></div><div className="weight-history">{state.weights.length ? state.weights.slice().reverse().map((entry) => <div key={`${entry.date}-${entry.value}`}><span>{entry.date}</span><b>{entry.value} kg</b></div>) : <div className="empty-line">还没有体重记录</div>}</div><div className="bcs-card"><ShieldCheck /><div><b>BCS 快速提示</b><p>理想体况通常能轻松摸到肋骨但不过分突出，从上方可见腰线。不同品种和疾病情况需要专业判断。</p></div></div></section></div></main>;
}
