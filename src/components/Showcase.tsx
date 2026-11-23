import { MessageSquareText, ArrowRight, Clock3 } from "lucide-react";
import { Reveal, GlassCard, CountUp, SectionHeading } from "./ui";

const features = [
  ["待办建议确认", "新消息先生成建议，添加/删除/恢复由你决定。"],
  ["分屏溯源", "左聊天右详情，高亮+编号双向+连线。"],
  ["记忆策展", "候选显式晋升，召回可解释、会衰减。"],
  ["主动判断", "节拍+静默/配额/批准门控+决策账本。"],
  ["设备风险门控", "三级风险，AI 操作单次批准。"],
  ["双模式理解", "AI 接口与规则演示可切换。"],
];
const flow = ["群消息", "结构化提取", "待办建议", "用户确认", "提醒 / 记忆 / 设备"];

export default function Showcase({ stats }: { stats: { groups: number; todo: number; memory: number; reminders: number } }) {
  return (
    <div className="border-b border-line-soft">
      <section className="mx-auto max-w-7xl px-4 pt-14 pb-10">
        <Reveal>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="chip mb-5">参赛 DEMO · 理想化模拟 · 架构留真实接入口</div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-ink">消息有着落，<br />生活有回音。</h1>
              <p className="mt-5 max-w-xl text-muted">Whale 把五个模拟群的消息整理成可确认的待办、可解释的记忆与克制的主动提醒，并以风险门控连接模拟设备。每一项都有来源可查。</p>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted"><Clock3 className="h-4 w-4 text-clay-deep" />演示时钟 BASE = 2026-11-20 09:00 (UTC+8)</div>
            </div>
            <GlassCard className="p-5">
              <div className="mb-3 flex items-center gap-2 text-xs text-muted"><MessageSquareText className="h-4 w-4 text-clay-deep" />项目协作群 · 负责人</div>
              <div className="rounded-xl rounded-tl-sm bg-paper-2 p-3 text-sm text-ink-2">湖边测试4K30帧录制11月19日17:30集合，地点：湖边栈道。</div>
              <div className="my-3 flex justify-center"><ArrowRight className="h-5 w-5 rotate-90 text-moss" /></div>
              <div className="rounded-xl border border-line bg-moss-soft p-3 text-sm">
                <div className="font-medium text-moss">湖边测试4K30帧录制</div>
                <div className="mt-1 text-xs text-muted">11月19日 17:30 · 明确时刻 · 湖边栈道 · 待确认建议</div>
              </div>
            </GlassCard>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[["模拟群", stats.groups], ["待处理事项", stats.todo], ["记忆记录", stats.memory], ["主动提醒", stats.reminders]].map(([label, v], i) => (
              <div key={i} className="border-l border-line pl-4">
                <div className="font-display text-3xl font-semibold text-clay-deep"><CountUp value={v as number} /></div>
                <div className="mt-1 text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Reveal><SectionHeading eyebrow="Features" title="六个核心能力" sub="展示与工具一体：下方即五视图工作区。" /></Reveal>
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-3">
          {features.map(([t, d], i) => (
            <Reveal key={t} delay={i * 40}>
              <div className="border-t border-line pt-3">
                <div className="font-display font-semibold text-ink">{t}</div>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <Reveal><SectionHeading eyebrow="Workflow" title="一条消息的旅程" /></Reveal>
        <Reveal delay={60}>
          <div className="flex flex-wrap items-center gap-2">
            {flow.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className="chip">{s}</span>
                {i < flow.length - 1 && <ArrowRight className="h-4 w-4 text-clay" />}
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
