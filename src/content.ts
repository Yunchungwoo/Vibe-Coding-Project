export type Category = "관찰" | "기억" | "상상" | "감정";
export type Prompt = {
  id: string;
  category: Category;
  title: string;
  question: string;
};
export type Mission = { id: string; title: string; instruction: string };
export const categories: Category[] = ["관찰", "기억", "상상", "감정"];
export const prompts: Prompt[] = [
  {
    id: "p1",
    category: "관찰",
    title: "창가에 머문 빛",
    question: "오늘 창문으로 들어온 빛은 어디에 가장 오래 머물렀나요?",
  },
  {
    id: "p2",
    category: "기억",
    title: "오래된 주머니",
    question: "한동안 입지 않은 옷 주머니에서 무엇을 발견하고 싶나요?",
  },
  {
    id: "p3",
    category: "상상",
    title: "밤에 문을 여는 서점",
    question: "모두 잠든 시간에만 문을 여는 서점에는 어떤 책이 있을까요?",
  },
  {
    id: "p4",
    category: "감정",
    title: "작은 안도",
    question: "오늘 마음이 조금 놓였던 순간은 언제였나요?",
  },
  {
    id: "p5",
    category: "관찰",
    title: "기다리는 동안",
    question: "누군가를 기다리며 바라본 풍경에는 무엇이 있었나요?",
  },
  {
    id: "p6",
    category: "기억",
    title: "여름의 소리",
    question: "눈을 감으면 떠오르는 여름의 소리 하나를 적어볼까요?",
  },
  {
    id: "p7",
    category: "상상",
    title: "구름에게 보내는 편지",
    question: "내일 이곳을 지날 구름에게 어떤 부탁을 하고 싶나요?",
  },
  {
    id: "p8",
    category: "감정",
    title: "괜찮다는 말",
    question: "누군가의 작은 말 한마디가 마음에 남은 적 있나요?",
  },
  {
    id: "p9",
    category: "관찰",
    title: "식어가는 찻잔",
    question: "앞에 놓인 컵을 천천히 살펴보세요. 무엇이 눈에 들어오나요?",
  },
  {
    id: "p10",
    category: "기억",
    title: "돌아가는 길",
    question: "어린 시절 집으로 돌아가던 길에서 기억나는 장면은 무엇인가요?",
  },
  {
    id: "p11",
    category: "상상",
    title: "잃어버린 시간 가게",
    question: "잃어버린 십 분을 되찾는다면 무엇을 하고 싶나요?",
  },
  {
    id: "p12",
    category: "감정",
    title: "마음의 날씨",
    question: "오늘 마음이 날씨라면 어떤 하늘일까요?",
  },
  {
    id: "p13",
    category: "관찰",
    title: "발밑의 작은 세계",
    question: "평소 지나치던 발밑의 작은 것을 하나 묘사해볼까요?",
  },
  {
    id: "p14",
    category: "기억",
    title: "다시 듣고 싶은 목소리",
    question: "기억 속 누군가는 어떤 말투로 나를 불렀나요?",
  },
  {
    id: "p15",
    category: "상상",
    title: "나무의 하루",
    question: "동네 나무가 일기를 쓴다면 오늘 첫 문장은 무엇일까요?",
  },
  {
    id: "p16",
    category: "감정",
    title: "설렘이 머무는 곳",
    question: "기다려지는 일이 있을 때 나의 하루는 어떻게 달라지나요?",
  },
  {
    id: "p17",
    category: "관찰",
    title: "비가 남긴 것",
    question: "비가 그친 뒤 달라진 거리의 모습을 적어볼까요?",
  },
  {
    id: "p18",
    category: "기억",
    title: "처음 해본 일",
    question: "처음 무언가를 해냈던 날, 손은 무엇을 하고 있었나요?",
  },
  {
    id: "p19",
    category: "상상",
    title: "미래의 나와 한 끼",
    question: "십 년 뒤의 나와 마주 앉는다면 어떤 음식을 나누고 싶나요?",
  },
  {
    id: "p20",
    category: "감정",
    title: "말 대신 건넨 것",
    question: "말로 하기 어려운 마음을 다른 방식으로 전한 적 있나요?",
  },
  {
    id: "p21",
    category: "관찰",
    title: "익숙한 문 앞에서",
    question: "매일 여닫는 문에는 어떤 흔적이 남아 있나요?",
  },
  {
    id: "p22",
    category: "기억",
    title: "한 숟갈의 기억",
    question: "먹는 순간 어떤 날로 돌아가게 되는 음식이 있나요?",
  },
  {
    id: "p23",
    category: "상상",
    title: "달빛을 담는 병",
    question: "달빛을 병에 담아둘 수 있다면 언제 꺼내 쓰고 싶나요?",
  },
  {
    id: "p24",
    category: "감정",
    title: "나에게 남기는 인사",
    question: "오늘 하루를 보낸 나에게 어떤 인사를 건네고 싶나요?",
  },
];
export const missions: Mission[] = [
  {
    id: "m1",
    title: "마음을 장면으로 바꿔보기",
    instruction:
      "감정을 나타내는 단어 하나를 골라, 행동이나 풍경으로 표현해보세요. 그 마음은 어떤 모습인가요?",
  },
  {
    id: "m2",
    title: "문장에 숨 쉴 틈 주기",
    instruction:
      "길다고 느껴지는 문장이 있다면 두 문장으로 나눠보세요. 어디에서 잠깐 쉬어가고 싶나요?",
  },
  {
    id: "m3",
    title: "감각 하나 더하기",
    instruction:
      "글 속 장면에 소리, 냄새, 촉감 중 하나를 더해보세요. 그곳이 조금 더 가까워지나요?",
  },
  {
    id: "m4",
    title: "작은 것에 이름 붙이기",
    instruction:
      "넓고 막연한 표현 하나를 구체적인 것으로 바꿔보세요. 어떤 물건, 어떤 색, 어떤 움직임이었나요?",
  },
  {
    id: "m5",
    title: "가벼워지는 문장",
    instruction:
      "없어도 뜻이 전해지는 단어가 있나요? 한 단어를 덜어내고 천천히 다시 읽어보세요.",
  },
  {
    id: "m6",
    title: "움직임을 발견하기",
    instruction:
      "가만히 있는 장면에서 작은 움직임을 찾아보세요. 어떤 동사로 그 모습을 전할 수 있을까요?",
  },
  {
    id: "m7",
    title: "첫 문장 바꿔보기",
    instruction:
      "글에서 마음에 드는 장면을 맨 앞으로 옮겨보세요. 다른 시작이 어울리는지 읽어보세요.",
  },
  {
    id: "m8",
    title: "나의 말투로 읽어보기",
    instruction:
      "친한 사람에게 이야기하듯 읽어보세요. 평소 쓰지 않는 표현 하나를 내 말로 바꿔볼까요?",
  },
];
export function dailyPrompt(date = new Date()): Prompt {
  const day = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
  );
  return prompts[((day % prompts.length) + prompts.length) % prompts.length];
}
