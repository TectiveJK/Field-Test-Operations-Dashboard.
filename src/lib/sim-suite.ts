export interface SuiteStep {
  label: string;
  instruction: string;
}

export interface SuiteMission {
  id: string;
  name: string;
  category: string;
  description: string;
  expectedBehavior: string;
  procedure: string;
  steps: SuiteStep[];
}

export const CATEGORY_ORDER = [
  "Nominal flight",
  "In-flight interrupt and resume",
  "Ground / hold",
  "Land In Place (LIP)",
  "Emergency flight (EFL)",
  "No fly zone",
  "Look at",
];

export const SUITE: SuiteMission[] = [
  {
    id: "corridor-hive-to-hive",
    name: "Corridor hive to hive",
    category: "Nominal flight",
    description:
      "One normal flight: arm on the hive, take off, fly the corridor, come back to the hive landing point, and land on the hive.",
    expectedBehavior:
      "The drone arms, flies each part of the corridor in order, and lands on the hive. It should not freeze, stay in the previous mode, or go into an unexpected fail-safe.",
    procedure:
      "In SkyCommand, arm the drone while it is sitting on the hive and disarmed. Start a corridor mission. Watch take-off, the flight to the first waypoint, the main corridor, the flight to the hive landing point (HL), and the landing on the hive. Each part should finish before the next starts. Come back here and record one PASS or FAIL for the whole flight.",
    steps: [
      {
        label: "Arm on hive",
        instruction: "The drone is on the hive and disarmed. In SkyCommand, press arm.",
      },
      {
        label: "Take-off",
        instruction: "Create the corridor mission, start it, and wait until take-off finishes.",
      },
      {
        label: "To First Waypoint",
        instruction: "Wait until the drone reaches the first waypoint.",
      },
      {
        label: "Main corridor",
        instruction: "Let the drone fly the planned corridor and wait until that part finishes.",
      },
      {
        label: "To HL",
        instruction: "Wait until the drone reaches the hive landing point (HL).",
      },
      {
        label: "Landing on hive",
        instruction: "Wait until the drone lands on the hive and disarms.",
      },
    ],
  },
  {
    id: "viewpoint-swap-to-hive",
    name: "Viewpoint swap to hive",
    category: "Nominal flight",
    description:
      "Create a viewpoint task for drone 1, then deploy drone 2 with Run this task now so the drones swap and drone 1 returns to the hive.",
    expectedBehavior:
      "When drone 1 goes to the viewpoint task, another drone takes its position (swap) to do the task and drone 1 goes back to the hive.",
    procedure:
      "In SkyCommand, create a viewpoint task for drone 1. Save the mission and start it. When drone 1 goes to the viewpoint, deploy drone 2 by pressing the \"Run this task now\" button (on your right in the task field there is a play button next to the word viewpoint. Press it to deploy a new drone).",
    steps: [
      {
        label: "Viewpoint swap",
        instruction:
          "In SkyCommand, create a viewpoint task for drone 1. Save the mission and start it. When drone 1 goes to the viewpoint, deploy drone 2 by pressing the \"Run this task now\" button (play button next to the word viewpoint) so a new drone is deployed.",
      },
    ],
  },
  {
    id: "return-to-hive-from-viewpoint",
    name: "Return to Hive from viewpoint transit",
    category: "Nominal flight",
    description: "While a drone is flying to a viewpoint, send it back to the hive with Return to Hive.",
    expectedBehavior: "The drone stops going to the viewpoint and flies back to the hive.",
    procedure:
      "In SkyCommand, start a flight to a viewpoint. While the drone is still on the way (Viewpoint / to viewpoint), press Return to Hive. Watch it turn around and go to the hive. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "Return to Hive",
        instruction: "While the drone is flying to a viewpoint, press Return to Hive and watch it go back to the hive.",
      },
    ],
  },
  {
    id: "rtl-from-viewpoint",
    name: "RTL from viewpoint transit",
    category: "Nominal flight",
    description:
      "While a drone is flying to a viewpoint, press RTL (Return to Launch), then wait until that return finishes.",
    expectedBehavior:
      "The drone starts Return to Launch from the viewpoint flight and RTL finishes normally.",
    procedure:
      "In SkyCommand, start a flight to a viewpoint. While the drone is still on the way, press RTL (Return to Launch). Then wait until RTL itself finishes. Come back here and record one PASS or FAIL for both steps.",
    steps: [
      {
        label: "Issue RTL",
        instruction: "While the drone is flying to a viewpoint, press RTL (Return to Launch).",
      },
      {
        label: "RTL completes",
        instruction: "Wait until Return to Launch finishes.",
      },
    ],
  },
  {
    id: "inflight-loiter-then-resume",
    name: "In-flight loiter, then resume",
    category: "In-flight interrupt and resume",
    description:
      "During a flight, make the drone hover (loiter), then send it back to the mission.",
    expectedBehavior:
      "The drone stops and hovers, then continues the original mission when you press mission.",
    procedure:
      "In SkyCommand, start a corridor (the main corridor part is the easiest). While it is flying, press loiter and check that it hovers. Then press mission and check that it continues the plan. You can also try this during take-off, to the first waypoint, to HL, to a viewpoint, waiting for release, or to hive from swap — use a new flight for each. Record one PASS or FAIL. Mark PASS only if every phase you actually flew hovered and then continued.",
    steps: [
      {
        label: "Loiter",
        instruction:
          "While the drone is flying (take-off, first waypoint, corridor, to HL, to viewpoint, waiting for release, or to hive from swap), press loiter.",
      },
      {
        label: "Resume mission",
        instruction: "While it is hovering, press mission and check that it continues the plan.",
      },
    ],
  },
  {
    id: "inflight-posctl-then-resume",
    name: "In-flight POSCTL, then resume",
    category: "In-flight interrupt and resume",
    description:
      "During a flight, switch to position control (POSCTL), then send the drone back to the mission.",
    expectedBehavior:
      "The drone goes into position control. When you press mission from PostCTL / In control, it continues the original plan.",
    procedure:
      "In SkyCommand, start a corridor. While it is flying, press POSCTL (position control) and check that SkyCommand shows PostCTL / In control. Then press mission and check that it continues. Other parts of the flight can be tried on new flights. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "POSCTL",
        instruction: "While the drone is flying, press POSCTL (position control).",
      },
      {
        label: "Resume mission",
        instruction: "When SkyCommand shows PostCTL / In control, press mission and check that the plan continues.",
      },
    ],
  },
  {
    id: "inflight-efl-then-resume",
    name: "In-flight EFL, then resume",
    category: "In-flight interrupt and resume",
    description:
      "During a flight, start Emergency Flight (EFL), then send the drone back to the mission while it is still descending.",
    expectedBehavior:
      "Emergency Flight starts. Pressing mission during EFL descent puts the drone back on the original plan.",
    procedure:
      "In SkyCommand, start a corridor. While it is flying, press EFL (Emergency Flight). Check that it is descending in EFL. Then press mission and check that it continues the plan. Other parts of the flight can be tried on new flights. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "EFL",
        instruction: "While the drone is flying, press EFL (Emergency Flight).",
      },
      {
        label: "Resume mission",
        instruction: "While it is descending in Emergency Flight, press mission and check that the plan continues.",
      },
    ],
  },
  {
    id: "inflight-land-lip-then-resume",
    name: "In-flight Land / LIP, then resume",
    category: "In-flight interrupt and resume",
    description:
      "During a flight, press Land. That starts Land In Place (LIP): the drone lands where it is, not on the hive. Then send it back to the mission while it is still coming down. Do not use this during take-off.",
    expectedBehavior:
      "Land starts a Land In Place descent. Pressing mission while it is still coming down puts the drone back on the original plan.",
    procedure:
      "In SkyCommand, start a corridor. While it is flying the main corridor, press Land. The drone should start Land In Place (landing where it is now). While it is still coming down, press mission and check that it continues the plan. You can also try this on the way to the first waypoint, to HL, to a viewpoint, waiting for release, or to hive from swap. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "Land",
        instruction:
          "While flying to the first waypoint, on the corridor, to HL, to a viewpoint, waiting for release, or to hive from swap, press Land. This starts Land In Place.",
      },
      {
        label: "Resume from LIP",
        instruction:
          "While the drone is still coming down in Land In Place, press mission and check that it continues the plan.",
      },
    ],
  },
  {
    id: "posctl-from-hive",
    name: "POSCTL from the hive",
    category: "Ground / hold",
    description:
      "The drone is on the hive and disarmed. Switch to position control (POSCTL). Do not arm it for this test.",
    expectedBehavior:
      "The drone goes into position control while still on the hive. It should not arm or take off by itself.",
    procedure:
      "In SkyCommand, leave the drone on the hive and disarmed. Press POSCTL (position control). Check that the mode changes and that it does not take off. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "POSCTL on hive",
        instruction: "The drone is on the hive and disarmed. Press POSCTL (position control).",
      },
    ],
  },
  {
    id: "arm-from-postctl",
    name: "Arm from PostCTL",
    category: "Ground / hold",
    description: "The drone is already in position control (PostCTL / In control). Arm it.",
    expectedBehavior: "The drone arms and stays under control. It should not jump to an unexpected mode.",
    procedure:
      "In SkyCommand, put the drone in PostCTL / In control (position control). Then press arm. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "Arm",
        instruction: "When SkyCommand shows PostCTL / In control, press arm.",
      },
    ],
  },
  {
    id: "loiter-leave-hold",
    name: "From loiter, leave hold",
    category: "Ground / hold",
    description:
      "The drone is hovering (loiter). From there, try position control, Emergency Flight, or Land. Use a new flight for each command.",
    expectedBehavior:
      "Each command takes the drone out of hover into POSCTL, Emergency Flight, or Land, as you asked.",
    procedure:
      "In SkyCommand, put the drone in loiter (hover). Then try these on separate flights: POSCTL, EFL (Emergency Flight), and Land. Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      { label: "Loiter -> POSCTL", instruction: "While hovering, press POSCTL (position control)." },
      { label: "Loiter -> EFL", instruction: "While hovering, press EFL (Emergency Flight)." },
      { label: "Loiter -> Land", instruction: "While hovering, press Land." },
    ],
  },
  {
    id: "postctl-leave-hold",
    name: "From PostCTL, leave hold",
    category: "Ground / hold",
    description:
      "The drone is in position control (PostCTL / In control). From there, try loiter, Emergency Flight, or Land. Use a new flight for each command.",
    expectedBehavior:
      "Each command takes the drone out of position control into hover, Emergency Flight, or Land, as you asked.",
    procedure:
      "In SkyCommand, put the drone in PostCTL / In control. Then try these on separate flights: loiter, EFL (Emergency Flight), and Land. Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      { label: "PostCTL -> loiter", instruction: "In PostCTL / In control, press loiter." },
      { label: "PostCTL -> EFL", instruction: "In PostCTL / In control, press EFL (Emergency Flight)." },
      { label: "PostCTL -> Land", instruction: "In PostCTL / In control, press Land." },
    ],
  },
  {
    id: "lip-descent",
    name: "LIP descent",
    category: "Land In Place (LIP)",
    description:
      "LIP means Land In Place: the drone lands where it is, not on the hive. Start that landing, and while it is still coming down, try one command at a time.",
    expectedBehavior:
      "While the drone is coming down in Land In Place, it should accept Complete, loiter, POSCTL, EFL, or Land, and it should not get stuck in LIP.",
    procedure:
      "In SkyCommand, fly a mission, then press Land so the drone starts Land In Place (it lands where it is now). While it is still coming down, try these on separate flights: let it finish landing (Complete), loiter, POSCTL, EFL (Emergency Flight), and Land. Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      { label: "Complete", instruction: "While it is coming down in Land In Place, let the landing finish." },
      { label: "loiter", instruction: "While it is coming down in Land In Place, press loiter." },
      { label: "POSCTL", instruction: "While it is coming down in Land In Place, press POSCTL." },
      { label: "EFL", instruction: "While it is coming down in Land In Place, press EFL (Emergency Flight)." },
      { label: "Land", instruction: "While it is coming down in Land In Place, press Land again." },
    ],
  },
  {
    id: "after-lip-landing",
    name: "After LIP landing",
    category: "Land In Place (LIP)",
    description:
      "LIP means Land In Place. Let that landing finish so the drone is on the ground and disarmed. Then try arm, mission, position control, or Emergency Flight. Use a new attempt for each command.",
    expectedBehavior:
      "From the ground after Land In Place, arm, mission, POSCTL, and EFL should work. The drone should not stay stuck on the ground in LIP.",
    procedure:
      "In SkyCommand, start Land In Place and let the drone land and disarm. Then try these on separate attempts: arm, mission, POSCTL, and EFL (Emergency Flight). Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      { label: "arm", instruction: "After Land In Place has landed and disarmed, press arm." },
      { label: "mission", instruction: "After Land In Place has landed and disarmed, press mission." },
      { label: "POSCTL", instruction: "After Land In Place has landed and disarmed, press POSCTL." },
      { label: "EFL", instruction: "After Land In Place has landed and disarmed, press EFL (Emergency Flight)." },
    ],
  },
  {
    id: "lip-back-to-mission",
    name: "LIP back to mission",
    category: "Land In Place (LIP)",
    description:
      "LIP means Land In Place: the drone lands where it is, not on the hive. Start LIP, then cancel it so the drone goes back to the original mission. While it is going back, try one command at a time.",
    expectedBehavior:
      "The drone should leave Land In Place and rejoin the mission. If you interrupt that return, it should accept the command and not get stuck in LIP.",
    procedure:
      "In SkyCommand, fly a mission (a corridor is fine). Press Land so the drone starts Land In Place and begins to come down. Before it finishes landing, cancel LIP / send it back to the mission. SkyCommand should show LIP / Back to mission. Then try these on separate flights: let the return finish (Complete), loiter, POSCTL, EFL (Emergency Flight), and Land. Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      {
        label: "Complete",
        instruction: "Cancel Land In Place so the drone goes back to the mission, and wait until that return finishes.",
      },
      {
        label: "loiter",
        instruction: "While the drone is going back from Land In Place to the mission, press loiter.",
      },
      {
        label: "POSCTL",
        instruction: "While the drone is going back from Land In Place to the mission, press POSCTL.",
      },
      {
        label: "EFL",
        instruction: "While the drone is going back from Land In Place to the mission, press EFL (Emergency Flight).",
      },
      {
        label: "Land",
        instruction: "While the drone is going back from Land In Place to the mission, press Land.",
      },
    ],
  },
  {
    id: "efl-descent",
    name: "EFL descent",
    category: "Emergency flight (EFL)",
    description:
      "EFL means Emergency Flight. Start it, and while the drone is still coming down, try one command at a time.",
    expectedBehavior:
      "While the drone is descending in Emergency Flight, it should accept Complete, loiter, POSCTL, EFL, or Land, and it should not get stuck in EFL.",
    procedure:
      "In SkyCommand, fly a mission, then press EFL (Emergency Flight). While the drone is still coming down, try these on separate flights: let Emergency Flight finish (Complete), loiter, POSCTL, EFL again, and Land. Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      { label: "Complete", instruction: "While it is coming down in Emergency Flight, let that descent finish." },
      { label: "loiter", instruction: "While it is coming down in Emergency Flight, press loiter." },
      { label: "POSCTL", instruction: "While it is coming down in Emergency Flight, press POSCTL." },
      { label: "EFL", instruction: "While it is coming down in Emergency Flight, press EFL again." },
      { label: "Land", instruction: "While it is coming down in Emergency Flight, press Land." },
    ],
  },
  {
    id: "efl-loiter",
    name: "EFL loiter",
    category: "Emergency flight (EFL)",
    description:
      "The drone is hovering after Emergency Flight (EFL loiter). From there, try mission, position control, Emergency Flight, or Land. Use a new flight for each command.",
    expectedBehavior:
      "Each command takes the drone out of Emergency Flight hover, including going back to the mission.",
    procedure:
      "In SkyCommand, put the drone in EFL / Loiter (hover after Emergency Flight). Then try these on separate flights: mission, POSCTL, EFL, and Land. Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      { label: "mission", instruction: "From Emergency Flight hover, press mission." },
      { label: "POSCTL", instruction: "From Emergency Flight hover, press POSCTL." },
      { label: "EFL", instruction: "From Emergency Flight hover, press EFL again." },
      { label: "Land", instruction: "From Emergency Flight hover, press Land." },
    ],
  },
  {
    id: "efl-back-to-mission",
    name: "EFL back to mission",
    category: "Emergency flight (EFL)",
    description:
      "Start Emergency Flight, then send the drone back to the original mission. While it is going back, try one command at a time.",
    expectedBehavior:
      "The drone should leave Emergency Flight and rejoin the mission. If you interrupt that return, it should accept the command and not get stuck in EFL.",
    procedure:
      "In SkyCommand, start Emergency Flight, then send the drone back to the mission. SkyCommand should show EFL / Back to mission. Then try these on separate flights: let the return finish (Complete), loiter, POSCTL, EFL, and Land. Come back here and record one PASS or FAIL. Mark PASS only if every command you actually flew worked.",
    steps: [
      {
        label: "Complete",
        instruction: "Send the drone back from Emergency Flight to the mission, and wait until that return finishes.",
      },
      {
        label: "loiter",
        instruction: "While the drone is going back from Emergency Flight to the mission, press loiter.",
      },
      {
        label: "POSCTL",
        instruction: "While the drone is going back from Emergency Flight to the mission, press POSCTL.",
      },
      {
        label: "EFL",
        instruction: "While the drone is going back from Emergency Flight to the mission, press EFL.",
      },
      {
        label: "Land",
        instruction: "While the drone is going back from Emergency Flight to the mission, press Land.",
      },
    ],
  },
  {
    id: "no-fly-zone-violation",
    name: "No fly zone violation",
    category: "No fly zone",
    description:
      "Create a corridor mission with a no fly zone between the corridor and the hive, then after take-off send a Go to in front of the corridor and check that the drone goes around the no fly zone.",
    expectedBehavior:
      "After the Go to command the drone reaches the Go to point going around the no fly zone location.",
    procedure:
      "In SkyCommand, create a corridor mission and between the corridor and the hive add a no fly zone location. Save the mission and start it. After arming the drone and it takes off, right-click in front of the corridor area and engage the Go to command. See if the drone violates the no fly zone location and, if it does, what it is doing after. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "Corridor and no fly zone",
        instruction:
          "Create a corridor mission. Between the corridor and the hive, add a no fly zone location.",
      },
      {
        label: "Save and start",
        instruction: "Save the mission and start it. Arm the drone and wait until it takes off.",
      },
      {
        label: "Go to",
        instruction:
          "Right-click in front of the corridor area and engage the Go to command.",
      },
      {
        label: "Watch the no fly zone",
        instruction:
          "See if the drone violates the no fly zone location and, if it does, what it is doing after. It should reach the Go to point by going around the no fly zone.",
      },
    ],
  },
  {
    id: "look-at-command",
    name: "Look At Command",
    category: "Look at",
    description:
      "Create a corridor in the SkyCommand Simulator with Look at, then take the drone manual, move it a bit, press mission again, and check that it still looks at the same point.",
    expectedBehavior:
      "After you command the drone to look at a certain point, until you will undo this command, it should look at that point.",
    procedure:
      "Create a corridor mission in the SkyCommand Simulator, with the drone following a flight path looking at a point with the Look at command. Then take it manual, move it a bit, and press mission again. Check if the drone still looks at the point you asked it to look with the Look at command. Come back here and record one PASS or FAIL.",
    steps: [
      {
        label: "Corridor with Look at",
        instruction:
          "Create a corridor mission in the SkyCommand Simulator. Set the drone to follow the flight path looking at a point with the Look at command.",
      },
      {
        label: "Manual",
        instruction: "Take the drone manual and move it a bit.",
      },
      {
        label: "Mission again",
        instruction: "Press mission again.",
      },
      {
        label: "Check Look at",
        instruction:
          "Check if the drone still looks at the point you asked it to look with the Look at command.",
      },
    ],
  },
];

{
  const ids = SUITE.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate suite mission ids");
  }
  if (ids.length !== 20) {
    throw new Error(`Expected 20 missions, got ${ids.length}`);
  }
}
