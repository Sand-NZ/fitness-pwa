/**
 * defaultData.js — 预置种子数据
 * 首次启动时由 app.js 载入
 * 依赖：models.js
 */
const DefaultData = {};

// 固定 ID 前缀，便于计划引用
const ID = {
  // 热身
  catCow: 'ex_warm_cat_cow',
  pullUpHang: 'ex_warm_pullup_hang',
  spiderCrawl: 'ex_warm_spider_crawl',
  bandAbduction: 'ex_warm_band_abduction',
  bandShoulderPress: 'ex_warm_band_shoulder_press',
  bellyBreath: 'ex_warm_belly_breath',
  greatStretch: 'ex_warm_great_stretch',
  xiphoidBreath: 'ex_warm_xiphoid_breath',
  singleLegBreath: 'ex_warm_single_leg_breath',
  pushUpBreath: 'ex_warm_pushup_breath',
  jackknifeBreath: 'ex_warm_jackknife_breath',
  posteriorBreath: 'ex_warm_posterior_breath',
  lateralBreath: 'ex_warm_lateral_breath',
  benchDip: 'ex_warm_bench_dip',
  // 推日
  barbellBench: 'ex_push_barbell_bench',
  dumbbellBench: 'ex_push_dumbbell_bench',
  dipAssisted: 'ex_push_dip_assisted',
  inclineDumbbell: 'ex_push_incline_dumbbell',
  reverseFly: 'ex_push_reverse_fly',
  butterfly: 'ex_push_butterfly',
  straightArmPulldown: 'ex_push_straight_arm_pulldown',
  bentOverRearFly: 'ex_push_bent_over_rear_fly',
  // 拉日
  pullupAssisted: 'ex_pull_pullup_assisted',
  latPulldown: 'ex_pull_lat_pulldown',
  tBarRow: 'ex_pull_tbar_row',
  cableRow: 'ex_pull_cable_row',
  oneArmRow: 'ex_pull_one_arm_row',
  facePull: 'ex_pull_face_pull',
  dumbbellShoulderPress: 'ex_pull_dumbbell_shoulder_press',
  staticHang: 'ex_pull_static_hang',
  // 腿日
  bulgarianSquat: 'ex_leg_bulgarian_squat',
  romanianDeadlift: 'ex_leg_romanian_deadlift',
  lunge: 'ex_leg_lunge',
  backExtension: 'ex_leg_back_extension',
  copenhagen: 'ex_leg_copenhagen',
  // 核心
  plank: 'ex_core_plank',
  sawPushup: 'ex_core_saw_pushup',
  crunch: 'ex_core_crunch',
  legRaise: 'ex_core_leg_raise'
};

// 标准字段
const _fields = () => [
  newField('weight', '重量 (kg)', 'number', { unit: 'kg', step: 0.5, required: true }),
  newField('reps', '次数', 'number', { unit: '次', step: 1, required: true })
];

DefaultData.exercises = [
  // ====== 热身 ======
  { id: ID.catCow, name: '猫牛式', category: '热身', defaultRest: 30, tags: [], note: '脊柱灵活性', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] },
  { id: ID.pullUpHang, name: '单杠拉背', category: '热身', defaultRest: 30, tags: [], note: '肩胛激活', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] },
  { id: ID.spiderCrawl, name: '蜘蛛趴', category: '热身', defaultRest: 30, tags: [], note: '髋关节灵活性', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] },
  { id: ID.bandAbduction, name: '弹力带大臂外展', category: '热身', defaultRest: 30, tags: [], note: '', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] },
  { id: ID.bandShoulderPress, name: '弹力带推肩', category: '热身', defaultRest: 30, tags: [], note: '', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] },
  { id: ID.bellyBreath, name: '腹式呼吸', category: '热身', defaultRest: 15, tags: [], note: '', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },
  { id: ID.greatStretch, name: '伟大者拉伸', category: '热身', defaultRest: 15, tags: [], note: '胸椎+髋屈肌', fields: [newField('reps', '次数', 'number', { unit: '次/侧', step: 1 })] },
  { id: ID.xiphoidBreath, name: '剑突呼吸', category: '热身', defaultRest: 15, tags: [], note: '', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },
  { id: ID.singleLegBreath, name: '单腿呼吸', category: '热身', defaultRest: 15, tags: [], note: '', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },
  { id: ID.pushUpBreath, name: '折刀/四点/正斜推吸', category: '热身', defaultRest: 15, tags: [], note: '', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] },
  { id: ID.jackknifeBreath, name: '折刀呼吸', category: '热身', defaultRest: 15, tags: [], note: '', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },
  { id: ID.posteriorBreath, name: '后纵隔呼吸', category: '热身', defaultRest: 15, tags: [], note: '', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },
  { id: ID.lateralBreath, name: '侧纵隔呼吸', category: '热身', defaultRest: 15, tags: [], note: '', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },
  { id: ID.benchDip, name: '俯身臂屈伸', category: '热身', defaultRest: 30, tags: [], note: '', fields: _fields() },

  // ====== 推日 ======
  { id: ID.barbellBench, name: '杠铃卧推', category: '推', defaultRest: 120, tags: [], note: '主项', fields: _fields() },
  { id: ID.dumbbellBench, name: '哑铃卧推', category: '推', defaultRest: 90, tags: [], note: '主项', fields: _fields() },
  { id: ID.dipAssisted, name: '双杠臂屈伸（助力）', category: '推', defaultRest: 90, tags: [], note: '辅助', fields: _fields() },
  { id: ID.inclineDumbbell, name: '上斜哑铃卧推', category: '推', defaultRest: 90, tags: [], note: '辅助', fields: _fields() },
  { id: ID.reverseFly, name: '反向飞鸟', category: '推', defaultRest: 60, tags: [], note: '体态（铁律首位）', fields: _fields() },
  { id: ID.butterfly, name: '蝴蝶机夹胸', category: '推', defaultRest: 60, tags: [], note: '可选', fields: _fields() },
  { id: ID.straightArmPulldown, name: '器械直臂下压', category: '推', defaultRest: 60, tags: [], note: '可选', fields: _fields() },
  { id: ID.bentOverRearFly, name: '俯身哑铃后束飞鸟', category: '推', defaultRest: 60, tags: [], note: '可选', fields: _fields() },

  // ====== 拉日 ======
  { id: ID.pullupAssisted, name: '助力引体向上', category: '拉', defaultRest: 120, tags: [], note: '主项', fields: _fields() },
  { id: ID.latPulldown, name: '高位下拉', category: '拉', defaultRest: 90, tags: [], note: '辅助', fields: _fields() },
  { id: ID.tBarRow, name: 'T杆划船', category: '拉', defaultRest: 90, tags: [], note: '辅助', fields: _fields() },
  { id: ID.cableRow, name: '钢索划船', category: '拉', defaultRest: 90, tags: [], note: '辅助', fields: _fields() },
  { id: ID.oneArmRow, name: '单臂哑铃划船', category: '拉', defaultRest: 90, tags: [], note: '辅助', fields: _fields() },
  { id: ID.facePull, name: '面拉', category: '拉', defaultRest: 60, tags: [], note: '体态（铁律首位）', fields: _fields() },
  { id: ID.dumbbellShoulderPress, name: '哑铃推肩', category: '拉', defaultRest: 90, tags: [], note: '记录在拉日', fields: _fields() },
  { id: ID.staticHang, name: '静态悬挂', category: '拉', defaultRest: 30, tags: [], note: '握力训练', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },

  // ====== 腿日 ======
  { id: ID.bulgarianSquat, name: '保加利亚蹲', category: '腿', defaultRest: 120, tags: [], note: '主项', fields: _fields() },
  { id: ID.romanianDeadlift, name: '罗马尼亚硬拉', category: '腿', defaultRest: 120, tags: [], note: '辅助', fields: _fields() },
  { id: ID.lunge, name: '后腿弓步蹲', category: '腿', defaultRest: 90, tags: [], note: '辅助', fields: _fields() },
  { id: ID.backExtension, name: '山羊挺身', category: '腿', defaultRest: 60, tags: [], note: '辅助', fields: [newField('weight', '重量 (kg)', 'number', { unit: 'kg', step: 0.5 }), newField('reps', '次数', 'number', { unit: '次', step: 1, required: true })] },
  { id: ID.copenhagen, name: '哥本哈根支撑', category: '腿', defaultRest: 60, tags: [], note: '辅助', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },

  // ====== 核心 ======
  { id: ID.plank, name: '平板支撑', category: '核心', defaultRest: 45, tags: [], note: '', fields: [newField('duration', '时长 (秒)', 'number', { unit: '秒', step: 5 })] },
  { id: ID.sawPushup, name: '锯式俯卧撑', category: '核心', defaultRest: 60, tags: [], note: '', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] },
  { id: ID.crunch, name: '卷腹', category: '核心', defaultRest: 45, tags: [], note: '', fields: [newField('weight', '负重 (kg)', 'number', { unit: 'kg', step: 0.5 }), newField('reps', '次数', 'number', { unit: '次', step: 1, required: true })] },
  { id: ID.legRaise, name: '仰卧抬腿', category: '核心', defaultRest: 45, tags: [], note: '', fields: [newField('reps', '次数', 'number', { unit: '次', step: 1 })] }
];

DefaultData.plans = [
  {
    id: 'plan_push',
    name: '推日',
    exercises: [
      { exerciseId: ID.barbellBench, overrideFields: [] },
      { exerciseId: ID.dumbbellBench, overrideFields: [] },
      { exerciseId: ID.dipAssisted, overrideFields: [] },
      { exerciseId: ID.inclineDumbbell, overrideFields: [] },
      { exerciseId: ID.reverseFly, overrideFields: [] },
      { exerciseId: ID.butterfly, overrideFields: [] },
      { exerciseId: ID.straightArmPulldown, overrideFields: [] },
      { exerciseId: ID.bentOverRearFly, overrideFields: [] }
    ]
  },
  {
    id: 'plan_pull',
    name: '拉日',
    exercises: [
      { exerciseId: ID.pullupAssisted, overrideFields: [] },
      { exerciseId: ID.latPulldown, overrideFields: [] },
      { exerciseId: ID.tBarRow, overrideFields: [] },
      { exerciseId: ID.cableRow, overrideFields: [] },
      { exerciseId: ID.oneArmRow, overrideFields: [] },
      { exerciseId: ID.facePull, overrideFields: [] },
      { exerciseId: ID.dumbbellShoulderPress, overrideFields: [] },
      { exerciseId: ID.staticHang, overrideFields: [] }
    ]
  },
  {
    id: 'plan_leg',
    name: '腿日',
    exercises: [
      { exerciseId: ID.bulgarianSquat, overrideFields: [] },
      { exerciseId: ID.romanianDeadlift, overrideFields: [] },
      { exerciseId: ID.lunge, overrideFields: [] },
      { exerciseId: ID.backExtension, overrideFields: [] },
      { exerciseId: ID.copenhagen, overrideFields: [] }
    ]
  }
];

/**
 * seed — 首次启动时填充默认数据
 * 仅在 exercises 和 plans 均为空时执行
 */
DefaultData.seed = function() {
  const existingExercises = STORAGE.get(STORAGE.keys.exercises);
  const existingPlans = STORAGE.get(STORAGE.keys.plans);

  if (existingExercises && existingExercises.length > 0) return;
  if (existingPlans && existingPlans.length > 0) return;

  // 填充动作
  STORAGE.set(STORAGE.keys.exercises, this.exercises);
  // 填充计划
  STORAGE.set(STORAGE.keys.plans, this.plans);
  // 标记引导已完成
  localStorage.setItem('fitness_onboarding_complete', 'true');

  console.log('✅ 预置数据已载入：' + this.exercises.length + ' 个动作，' + this.plans.length + ' 个计划');
};

if (typeof window !== 'undefined') {
  window.DefaultData = DefaultData;
}
