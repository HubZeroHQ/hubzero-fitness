Design a rough but clear, modern responsive frontend prototype for a fitness tracking web application called:

FITNESS.HUBZERO.IN
Brand: HUB ZERO FITNESS

The website is for an existing Hub Zero fitness group/team. The goal is to let each member track their daily workouts in detail while keeping their personal strength data private. The team can publicly see a normalized progress visualization, but never another person's exact weights, reps, or private workout data.

IMPORTANT:
This is a frontend/product prototype only. Focus on UI, UX, navigation, interactions, states, and information hierarchy. Use realistic sample data. Do not build a generic fitness landing page.

==================================================
1. AUTHENTICATION
==================================================

First-time visitors should see a clean login screen.

Primary option:
"Login with HubZero"

The fitness website should use the existing HubZero account/authentication system rather than creating a separate fitness account.

Show:
- Hub Zero Fitness logo/name
- Short tagline such as "Train • Improve • Belong"
- "Login with HubZero" button
- Minimal clean authentication layout

After login, take the user directly to Today's Workout.

==================================================
2. MAIN NAVIGATION
==================================================

Use a responsive navigation system.

Desktop:
- Today's Workout
- My Progress
- Team Progress
- Profile

If the logged-in user is a Coach or Admin, also show:
- Coach Dashboard / Admin

Mobile:
Use a bottom navigation or compact navigation menu.

The interface should feel like a serious fitness tracking product, not a social media app.

==================================================
3. TODAY'S WORKOUT = MAIN HOME PAGE
==================================================

The main screen after login should immediately show today's workout.

Example:

Saturday, 19 September 2026
DAY 3
LEGS + CORE

Show today's exercises as individual workout cards.

Example exercises:

1. Leg Press / Hack Squat
Target: 3 × 6–10

2. Romanian Deadlift
Target: 3 × 8–12

3. Walking Lunges
Target: 2 × 10–15

4. Leg Curl
Target: 3 × 10–15

5. Calf Raises
Target: 3 × 10–15

6. Cable Crunch
Target: 3 × 10–15

7. Plank / Ab Wheel
Target: 2–3 × 30–60 sec

Each exercise must contain:

- Checkbox
- Exercise name
- Target sets/reps
- Weight input
- Detailed set/repetition tracking
- Tutorial interaction

CRITICAL INTERACTION RULE:

Only clicking the checkbox marks the exercise as completed.

Clicking the exercise name MUST NOT mark it as completed.

==================================================
4. EXERCISE TRACKING
==================================================

Each exercise should allow detailed tracking of every set.

Example:

☐ Lat Pulldown
Target: 3 × 6–10

SET     WEIGHT       REPS
1       [45] kg      [10]
2       [45] kg      [9]
3       [40] kg      [10]

+ Add Set

For a 3-set exercise, initially show 3 set rows.

Each set should have:
- Set number
- Weight input
- Reps input

Allow the user to add additional sets if they performed more than prescribed.

The user should be able to enter the actual weight and actual repetitions completed.

Entering weight or reps must NOT automatically mark the exercise as completed.

Only the checkbox changes completion status.

Show visual states:
- Not started
- In progress
- Completed

Example completed state:

☑ Lat Pulldown
3/3 sets logged
Workout completed

==================================================
5. EXERCISE TUTORIAL VIDEO
==================================================

Clicking the exercise name should open a small Picture-in-Picture style tutorial video.

Example:

User clicks:
"Lat Pulldown"

A small floating video player appears showing the Lat Pulldown tutorial.

The video should not interfere with the checkbox interaction.

The user should be able to:
- Play/pause
- Close/minimize the video
- Continue viewing the workout list

Use realistic placeholder/tutorial video thumbnails if actual videos are not available.

Each exercise should conceptually have:
- Exercise name
- Tutorial video URL
- Instructions

==================================================
6. WORKOUT COMPLETION
==================================================

At the top or bottom of Today's Workout show overall progress.

Example:

TODAY'S PROGRESS
4 / 7 exercises completed

██████████░░░░░ 57%

Also show:
- Completed sets
- Total prescribed sets
- Workout completion percentage

The user should be able to finish the workout even if some optional fields such as weight are empty.

==================================================
7. PERSONAL PROGRESS PAGE
==================================================

This page is PRIVATE.

Only the logged-in user can see their detailed workout performance.

Never expose another member's exact weight, reps, body measurements, or private workout history.

Show:

MY PROGRESS

Weekly Overview
- Workout completion %
- Exercises completed
- Sets completed
- Strength progression
- Training consistency

Monthly Overview
- Workout completion %
- Exercise progression
- Volume progression
- Training consistency

Include charts for:
- Weekly workout consistency
- Monthly workout consistency
- Exercise-specific progression
- Training volume
- Weight/repetition progression

Example:

LAT PULLDOWN

Previous Week
40 × 10
40 × 10
40 × 8

Current Week
45 × 10
45 × 9
40 × 10

Show:
Volume: 1,120 kg → 1,300 kg
Change: +16.1%

Also show monthly comparison.

Do not reduce all strength progress to one simplistic number. Exercise-specific progress should remain visible.

==================================================
8. PERSONAL WORKOUT HISTORY
==================================================

Include a calendar/history view.

Example:

SEPTEMBER 2026

19  Legs + Core       7/7 ✓
18  Pull              6/6 ✓
17  Push              7/7 ✓
16  Legs + Core       5/7
15  Pull              6/6 ✓
14  Push              7/7 ✓
13  Rest

Clicking a date opens that day's detailed workout log.

Show:
- Exercises
- Completion state
- Sets
- Weight
- Reps
- Notes if available

==================================================
9. TEAM PROGRESS PAGE
==================================================

This page is PUBLIC to authenticated team members and/or publicly accessible according to the product design.

IMPORTANT PRIVACY RULE:

Do NOT show:
- Exact weights lifted by other people
- Exact repetitions
- Personal workout logs
- Private body measurements
- Private notes

Instead, show a normalized progress/consistency metric.

Display all team members on ONE combined graph using different colors.

Example:

TEAM PROGRESS

                    Sep 1 ───────── Sep 19

Member A       ╱──────╲──────────────
Member B       ───╱──────────╲───────
Member C       ╱────────╱─────────────
Member D       ─────╱────────────────

Each person should have:
- Unique graph color
- Name/avatar
- Progress line

The graph represents normalized fitness progress rather than raw strength.

The public progress calculation should conceptually consider factors such as:
- Workout consistency
- Training intensity
- Progressive overload/progression
- Progress since fitness start date
- Relevant user baseline information such as age and height where appropriate

Do NOT publicly rank members based on who lifts the heaviest.

The purpose is to visualize individual progress and consistency over time, not create a leaderboard based on raw strength.

Include a legend showing each member and their graph color.

Allow filtering:
- 7 days
- 30 days
- 3 months
- All time

==================================================
10. COACH DASHBOARD
==================================================

Coach and Admin users have access to a separate management area.

COACH CAN:
- Create workout routines
- Edit workout routines
- Change today's workout
- Schedule future workouts
- Add/remove exercises
- Change target sets
- Change target rep ranges
- Add/edit tutorial videos
- Add exercise instructions
- View team workout adherence

Coach should NOT need to edit frontend code to change the workout routine.

Show a workout-plan editor.

Example:

DAY 1 — PUSH

Bench Press
3 × 6–10
Tutorial: [Edit]

Incline Dumbbell Press
3 × 8–12
Tutorial: [Edit]

Cable / Machine Fly
2 × 10–15

+ Add Exercise

Save Workout

==================================================
11. ADMIN DASHBOARD
==================================================

Admin has all Coach capabilities plus:

- User management
- Assign Coach/Admin roles
- Manage team members
- Manage workout schedules
- Manage public progress settings
- System settings

Show role badges:
Member
Coach
Admin

==================================================
12. PROFILE PAGE
==================================================

Show the logged-in user's fitness profile.

Fields:
- Name
- Profile photo/avatar
- Age
- Height
- Fitness start date
- Training experience
- Current workout plan

Keep private information clearly marked as private.

==================================================
13. PRIVACY DESIGN
==================================================

Privacy is a core feature.

Clearly separate:

PRIVATE PERSONAL DATA:
- Exact weight lifted
- Sets
- Reps
- Exercise history
- Body weight
- Measurements
- Personal notes
- Detailed workout history

PUBLIC TEAM DATA:
- Normalized progress
- Workout consistency/progress trend
- Team-level progress visualization
- Name/avatar depending on profile settings

The UI should make this distinction obvious.

Do not create a public leaderboard based on kilograms lifted.

==================================================
14. WORKOUT PROGRAM
==================================================

Use the following existing 6-day program as sample data.

DAY 1 — PUSH
Chest + Shoulders + Triceps

1. Bench Press — 3 × 6–10
2. Incline Dumbbell Press — 3 × 8–12
3. Cable / Machine Fly — 2 × 10–15
4. Shoulder Press — 3 × 6–10
5. Lateral Raises — 3 × 12–20
6. Triceps Pushdown — 3 × 10–15
7. Overhead Triceps Extension — 2 × 10–15

DAY 2 — PULL
Back + Rear Delts + Biceps

1. Lat Pulldown / Pull-ups — 3 × 6–10
2. Barbell / Cable Row — 3 × 6–10
3. Seated Cable Row — 2 × 8–12
4. Face Pulls / Rear Delt Fly — 3 × 12–20
5. Dumbbell / Barbell Curl — 3 × 8–12
6. Hammer Curl — 2 × 10–15

DAY 3 — LEGS + CORE

1. Squat / Leg Press — 3 × 6–10
2. Romanian Deadlift — 3 × 8–12
3. Leg Extension — 2 × 10–15
4. Leg Curl — 3 × 10–15
5. Calf Raises — 3 × 10–15
6. Cable Crunch — 3 × 10–15
7. Hanging Knee Raise — 2 × 8–15

DAY 4 — PUSH

1. Dumbbell Bench Press — 3 × 6–10
2. Incline Machine Press — 3 × 8–12
3. Cable Fly / Pec Deck — 2 × 10–15
4. Arnold Press / Shoulder Press — 3 × 6–10
5. Lateral Raises — 3 × 12–20
6. Triceps Pushdown — 3 × 10–15
7. Overhead Triceps Extension — 2 × 10–15

DAY 5 — PULL

1. Pull-ups / Lat Pulldown — 3 × 6–10
2. T-Bar Row / Cable Row — 3 × 8–10
3. Seated Cable Row — 2 × 8–12
4. Face Pulls — 3 × 12–20
5. Incline Dumbbell Curl — 3 × 8–12
6. Hammer Curl — 2 × 10–15

DAY 6 — LEGS + CORE

1. Leg Press / Hack Squat — 3 × 6–10
2. Romanian Deadlift — 3 × 8–12
3. Walking Lunges — 2 × 10–15
4. Leg Curl — 3 × 10–15
5. Calf Raises — 3 × 10–15
6. Cable Crunch — 3 × 10–15
7. Plank / Ab Wheel — 2–3 × 30–60 sec

DAY 7 — REST

Show:
Rest • Recover • Recharge

Optional:
Light walking / mobility

==================================================
15. DESIGN DIRECTION
==================================================

Visual style:

- Modern fitness-tech aesthetic
- Dark background
- High contrast
- Clean cards
- Strong typography
- Subtle red/blue/green accents inspired by the existing Hub Zero Fitness branding
- Avoid excessive gradients
- Avoid overly flashy bodybuilding aesthetics
- Professional enough to feel like a real fitness SaaS product
- Responsive desktop and mobile layouts
- Prioritize usability during an actual gym workout

The UI should have large enough touch targets for someone using the website on a phone at the gym.

Use clear states for:
- Checkbox unchecked
- Checkbox checked
- Input active
- Exercise completed
- Workout completed
- Tutorial video open
- Loading
- Empty history
- Rest day

==================================================
16. IMPORTANT INTERACTION DETAILS
==================================================

1. Clicking checkbox:
   → ONLY toggles workout completion.

2. Clicking exercise name:
   → Opens tutorial video/PiP.
   → DOES NOT toggle checkbox.

3. Entering weight:
   → Saves private performance data.
   → DOES NOT toggle checkbox.

4. Entering reps:
   → Saves private performance data.
   → DOES NOT toggle checkbox.

5. Adding a set:
   → Adds another weight + reps row.

6. Completing all exercises:
   → Shows workout completion state.

7. Changing date/history:
   → Loads the workout and logged data for that date.

8. New day:
   → Today's workout changes automatically according to the scheduled routine.
   → Previous workout data remains available in history.

9. Coach/Admin:
   → Can modify the workout routine and tutorial content.

10. Normal member:
   → Cannot modify workout routines.

==================================================
17. RESPONSIVE SCREENS TO GENERATE
==================================================

Create rough but clear designs for at least:

1. Login page
2. Today's Workout desktop
3. Today's Workout mobile
4. Exercise expanded/set tracking state
5. Tutorial PiP state
6. Workout completed state
7. Personal Progress dashboard
8. Exercise-specific progress/history
9. Calendar workout history
10. Public Team Progress graph
11. Profile page
12. Coach workout editor
13. Admin dashboard

Use realistic sample users and data.

The goal is to clearly communicate the complete product concept and user flow to developers and the Hub Zero team. Prioritize functionality, hierarchy, interactions, and privacy over decorative details.