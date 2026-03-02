import { db } from "./db";
import { juniorExercises, juniorWeeklyChallenges, juniorChallengeDays, juniorExerciseVideos } from "@shared/schema";
import { eq } from "drizzle-orm";

interface ExerciseData {
  name: string;
  description: string;
  category: "HOME" | "GYM" | "COURT" | "FOOTWORK" | "CORE" | "FLEXIBILITY" | "STRENGTH" | "CARDIO";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  durationMinutes?: number;
  reps?: number;
  sets?: number;
  equipment?: string;
  videoUrl?: string;
  location: string;
}

const EXERCISES: ExerciseData[] = [
  { name: "Burpees", description: "Full body exercise: lower to push-up position, transition to squat, finish with a vertical jump. Great for explosive power and coordination.", category: "CARDIO", difficulty: "HARD", reps: 10, sets: 3, location: "home", videoUrl: "https://www.youtube.com/watch?v=dZgVxmf6jkA" },
  { name: "Jump Rope / Skipping", description: "Start on toes with both legs, then single leg, then alternate. 10 minutes of skipping equals 1.5km running. Improves footwork, balance and cardiovascular fitness.", category: "CARDIO", difficulty: "EASY", durationMinutes: 10, location: "home", equipment: "Skipping rope", videoUrl: "https://www.youtube.com/watch?v=u3zgHI8QnqE" },
  { name: "Wall Rallies", description: "Rally shuttlecock against a wall 500-1000 times. Bend knees, pace yourself, relax grip. Builds wrist strength and shot consistency.", category: "HOME", difficulty: "EASY", reps: 500, sets: 1, location: "home", equipment: "Racquet, shuttlecock", videoUrl: "https://www.youtube.com/watch?v=sS15YgF29HA" },
  { name: "Shuttle Runs", description: "Sprint between two lines 6m apart. Touch the line at each end. Builds speed, agility and conditioning fitness.", category: "CARDIO", difficulty: "MEDIUM", reps: 10, sets: 3, location: "home" },
  { name: "Lunges", description: "Step forward into a deep lunge, keeping back straight. Alternate legs. Strengthens quads, glutes and improves court movement.", category: "STRENGTH", difficulty: "EASY", reps: 12, sets: 3, location: "home" },
  { name: "Shadow Footwork", description: "Practice moving to all 6 corners of an imaginary court with proper footwork technique. Focus on split step, lunge and recovery.", category: "FOOTWORK", difficulty: "MEDIUM", durationMinutes: 10, location: "home", videoUrl: "https://www.youtube.com/watch?v=HbVPHqcOv2M" },
  { name: "Plank Hold", description: "Hold a straight-arm or forearm plank position. Keep body in straight line from head to heels. Builds core stability essential for racket sports.", category: "CORE", difficulty: "EASY", durationMinutes: 1, sets: 3, location: "home" },
  { name: "Mountain Climbers", description: "From plank position, drive knees alternately toward chest at speed. Great for core, shoulders and cardiovascular fitness.", category: "CARDIO", difficulty: "MEDIUM", reps: 20, sets: 3, location: "home" },
  { name: "High Knees", description: "Run on the spot lifting knees to hip height. Pump arms for momentum. Builds speed and agility for court movement.", category: "CARDIO", difficulty: "EASY", durationMinutes: 1, sets: 3, location: "home" },
  { name: "Squat Jumps", description: "Lower into squat then explode upward. Land softly and repeat. Builds explosive leg power for jumps and lunges on court.", category: "STRENGTH", difficulty: "MEDIUM", reps: 15, sets: 3, location: "home" },
  { name: "Shuttle Juggling", description: "Hit shuttlecock continuously 3 feet in the air. Practice palm-up, then palm-down, then alternate. Builds racket control and hand-eye coordination.", category: "HOME", difficulty: "EASY", durationMinutes: 5, location: "home", equipment: "Racquet, shuttlecock" },
  { name: "Ready Position Practice", description: "Stand with feet shoulder-width apart in quarter squat. Weight on balls of feet. Practice moving forward/back, side-to-side, always returning to base.", category: "FOOTWORK", difficulty: "EASY", durationMinutes: 5, location: "home" },
  { name: "Star Jumps", description: "Jump up spreading arms and legs into a star shape, then land together. Great cardiovascular exercise and warm-up.", category: "CARDIO", difficulty: "EASY", reps: 20, sets: 3, location: "home" },
  { name: "Tuck Jumps", description: "Jump vertically and bring knees to chest at peak. Land softly. Builds explosive power needed for jump smashes.", category: "STRENGTH", difficulty: "HARD", reps: 10, sets: 3, location: "home" },
  { name: "Bear Crawls", description: "Walk on hands and feet keeping hips low. Move forward and backward. Builds full body strength and coordination.", category: "STRENGTH", difficulty: "MEDIUM", durationMinutes: 1, sets: 3, location: "home" },
  { name: "Dumbbell Shoulder Press", description: "Press dumbbells overhead from shoulder height. Strengthens shoulders for overhead shots and smashes.", category: "GYM", difficulty: "MEDIUM", reps: 12, sets: 3, location: "gym", equipment: "Dumbbells" },
  { name: "Battle Ropes", description: "Create waves with heavy ropes using alternating or simultaneous arm movements. Builds arm endurance and grip strength.", category: "GYM", difficulty: "HARD", durationMinutes: 1, sets: 5, location: "gym", equipment: "Battle ropes" },
  { name: "Leg Press", description: "Push weight away using legs on a leg press machine. Builds leg strength for powerful lunges and court movement.", category: "GYM", difficulty: "MEDIUM", reps: 12, sets: 3, location: "gym", equipment: "Leg press machine" },
  { name: "Medicine Ball Throws", description: "Overhead throw or rotational throw with medicine ball. Builds core rotation power for smashes and drives.", category: "GYM", difficulty: "MEDIUM", reps: 10, sets: 3, location: "gym", equipment: "Medicine ball" },
  { name: "Box Jumps", description: "Jump onto a sturdy box or platform. Step down and repeat. Builds explosive leg power and confidence.", category: "GYM", difficulty: "HARD", reps: 10, sets: 3, location: "gym", equipment: "Plyo box" },
  { name: "Resistance Band Pulls", description: "Attach band to fixed point and practice pulling movements mimicking racket sport strokes. Builds shot-specific muscle groups.", category: "GYM", difficulty: "EASY", reps: 15, sets: 3, location: "gym", equipment: "Resistance band" },
  { name: "Cable Rotations", description: "Use cable machine for rotational pulls simulating racket swing. Builds core rotation strength.", category: "GYM", difficulty: "MEDIUM", reps: 12, sets: 3, location: "gym", equipment: "Cable machine" },
  { name: "Bench Press", description: "Lie on bench and press barbell upward. Builds chest and arm strength for powerful overhead shots.", category: "GYM", difficulty: "MEDIUM", reps: 10, sets: 3, location: "gym", equipment: "Bench, barbell" },
  { name: "6-Corner Shadow Drill", description: "Move to all 6 corners of an imaginary court: front-right, front-left, mid-right, mid-left, back-right, back-left. Focus on split step before each move.", category: "FOOTWORK", difficulty: "MEDIUM", reps: 20, sets: 3, location: "home", videoUrl: "https://www.youtube.com/watch?v=HbVPHqcOv2M" },
  { name: "Split Step Reaction Drill", description: "Perform a small hop (split step) and immediately push off to a random corner. Return to center and pause. Trains explosive starts.", category: "FOOTWORK", difficulty: "MEDIUM", reps: 20, sets: 3, location: "home" },
  { name: "Lateral Shuffles", description: "Shuffle sideways staying low with feet never crossing. Quick direction changes. Essential for mid-court coverage.", category: "FOOTWORK", difficulty: "EASY", durationMinutes: 2, sets: 3, location: "home" },
  { name: "Fast Feet Taps", description: "Quick toe-taps on the spot as fast as possible. Keep weight on balls of feet. Builds reaction speed.", category: "FOOTWORK", difficulty: "EASY", durationMinutes: 1, sets: 5, location: "home" },
  { name: "Agility Ladder Drill", description: "One foot in, two feet in, side shuffle, hopscotch patterns through a ladder. No ladder? Use chalk lines or tape.", category: "FOOTWORK", difficulty: "MEDIUM", durationMinutes: 5, sets: 3, location: "home", equipment: "Agility ladder (optional)" },
  { name: "Cross-Step Drill", description: "Practice crossing one foot behind the other while moving laterally. Essential for reaching wide shots on the backhand side.", category: "FOOTWORK", difficulty: "HARD", reps: 15, sets: 3, location: "home" },
  { name: "Lunge Recovery Drill", description: "Deep lunge forward then push back to base position explosively. Alternate legs. Mimics on-court net shot recovery.", category: "FOOTWORK", difficulty: "MEDIUM", reps: 12, sets: 3, location: "home" },
  { name: "Backward Movement Drill", description: "Practice moving backward from net position using proper footwork: turn, shuffle, then chassé back to rear court.", category: "FOOTWORK", difficulty: "HARD", reps: 10, sets: 3, location: "home" },
  { name: "Side Plank", description: "Lie on side with elbow under shoulder. Lift hips to form straight line. Builds oblique and hip stability.", category: "CORE", difficulty: "MEDIUM", durationMinutes: 1, sets: 3, location: "home" },
  { name: "Russian Twists", description: "Sit with knees bent, lean back slightly, twist torso side to side. Optional: hold weight. Builds rotational core power.", category: "CORE", difficulty: "MEDIUM", reps: 20, sets: 3, location: "home" },
  { name: "Dead Bug", description: "Lie on back, extend opposite arm and leg while keeping lower back pressed to floor. Builds deep core stability.", category: "CORE", difficulty: "EASY", reps: 10, sets: 3, location: "home" },
  { name: "Bird Dog", description: "From all fours, extend opposite arm and leg. Hold briefly then switch. Improves balance and core coordination.", category: "CORE", difficulty: "EASY", reps: 10, sets: 3, location: "home" },
  { name: "Superman Hold", description: "Lie face down, lift arms and legs off floor simultaneously. Hold for 3 seconds. Strengthens lower back and posterior chain.", category: "CORE", difficulty: "EASY", reps: 10, sets: 3, location: "home" },
  { name: "V-Sits", description: "Sit and lift legs and torso to form V shape. Hold or pulse. Advanced core exercise for trunk stability.", category: "CORE", difficulty: "HARD", reps: 10, sets: 3, location: "home" },
  { name: "Bicycle Crunches", description: "Lie on back, pedal legs while twisting elbow to opposite knee. Works entire abdominal wall including obliques.", category: "CORE", difficulty: "MEDIUM", reps: 20, sets: 3, location: "home" },
  { name: "Dynamic Stretches", description: "Arm circles, leg swings, torso rotations, high kicks. Essential warm-up routine before any training session.", category: "FLEXIBILITY", difficulty: "EASY", durationMinutes: 5, location: "home" },
  { name: "Hip Openers", description: "Deep lunges with rotation, pigeon pose, butterfly stretch. Opens hips for wider lunges on court.", category: "FLEXIBILITY", difficulty: "EASY", durationMinutes: 5, location: "home" },
  { name: "Shoulder Mobility", description: "Arm circles, cross-body stretches, wall slides, band pull-aparts. Maintains shoulder health for overhead shots.", category: "FLEXIBILITY", difficulty: "EASY", durationMinutes: 5, location: "home" },
  { name: "Hamstring Stretches", description: "Standing toe touches, seated forward fold, lying hamstring stretch with band. Prevents injury and improves lunge depth.", category: "FLEXIBILITY", difficulty: "EASY", durationMinutes: 5, location: "home" },
  { name: "Ankle Mobility", description: "Ankle circles, calf stretches, toe raises. Critical for quick direction changes and injury prevention.", category: "FLEXIBILITY", difficulty: "EASY", durationMinutes: 3, location: "home" },
  { name: "Wrist Circles", description: "Rotate wrists in both directions. Flex and extend. Essential for racket control and preventing wrist strain.", category: "FLEXIBILITY", difficulty: "EASY", durationMinutes: 2, location: "home" },
  { name: "Push-ups", description: "Classic push-up from toes or knees. Keep body straight. Builds chest, shoulder and arm strength for shots.", category: "STRENGTH", difficulty: "MEDIUM", reps: 15, sets: 3, location: "home" },
  { name: "Tricep Dips", description: "Using a chair or bench, lower and raise body using arms. Builds tricep strength for powerful overhead shots.", category: "STRENGTH", difficulty: "MEDIUM", reps: 12, sets: 3, location: "home", equipment: "Chair or bench" },
  { name: "Calf Raises", description: "Stand on edge of step, raise and lower heels. Builds calf strength for quick movement and jumping.", category: "STRENGTH", difficulty: "EASY", reps: 20, sets: 3, location: "home" },
  { name: "Wall Sits", description: "Lean against wall with thighs parallel to floor. Hold as long as possible. Builds leg endurance for long rallies.", category: "STRENGTH", difficulty: "MEDIUM", durationMinutes: 1, sets: 3, location: "home" },
  { name: "Squat Holds", description: "Lower into deep squat and hold position. Builds leg endurance and hip mobility for court movement.", category: "STRENGTH", difficulty: "EASY", durationMinutes: 1, sets: 3, location: "home" },
  { name: "Sprint Intervals", description: "30 second all-out sprint followed by 30 second rest. Mimics the stop-start nature of racket sport rallies.", category: "CARDIO", difficulty: "HARD", durationMinutes: 10, location: "home" },
  { name: "Single Leg Balance", description: "Stand on one leg for 30 seconds. Close eyes for added difficulty. Builds stability for reaching shots.", category: "FLEXIBILITY", difficulty: "EASY", durationMinutes: 2, sets: 3, location: "home" },
  { name: "Grip Change Drill", description: "Practice switching between forehand and backhand grips rapidly. Do 50 switches. Builds grip agility for shot variety.", category: "HOME", difficulty: "EASY", reps: 50, sets: 2, location: "home", equipment: "Racquet" },
  { name: "Racket Swing Practice", description: "Practice overhead clear, drop shot and smash swings without a shuttle. Focus on making all three look identical for deception.", category: "HOME", difficulty: "EASY", reps: 30, sets: 3, location: "home", equipment: "Racquet" },
  { name: "Serve Practice", description: "Set up targets on floor. Practice low serve aiming for accuracy. 50 serves per side. Builds serve consistency.", category: "HOME", difficulty: "MEDIUM", reps: 50, sets: 2, location: "home", equipment: "Racquet, shuttlecocks" },
];

interface VideoData {
  title: string;
  youtubeUrl: string;
  category: "HOME" | "GYM" | "COURT" | "FOOTWORK" | "CORE" | "FLEXIBILITY" | "STRENGTH" | "CARDIO";
  description: string;
}

const EXERCISE_VIDEOS: VideoData[] = [
  { title: "Wall Rally Technique for Beginners", youtubeUrl: "https://www.youtube.com/watch?v=sS15YgF29HA", category: "HOME", description: "Learn proper wall rally technique to improve wrist strength and shot consistency at home." },
  { title: "Footwork Basics", youtubeUrl: "https://www.youtube.com/watch?v=HbVPHqcOv2M", category: "FOOTWORK", description: "Master the 6-corner footwork pattern that forms the foundation of all court movement." },
  { title: "Core Stability for Racket Sports", youtubeUrl: "https://www.youtube.com/watch?v=coHoKoeS3MM", category: "CORE", description: "Coaches explain why core workout is crucial for racket sport performance." },
  { title: "Home Exercises for Racket Sports", youtubeUrl: "https://www.youtube.com/watch?v=dZgVxmf6jkA", category: "HOME", description: "7 effective exercises you can do at home to improve your game." },
  { title: "Jump Rope for Sports Fitness", youtubeUrl: "https://www.youtube.com/watch?v=u3zgHI8QnqE", category: "CARDIO", description: "Skipping rope techniques to improve footwork speed and cardiovascular endurance." },
  { title: "Agility Training", youtubeUrl: "https://www.youtube.com/watch?v=4EvLfk15QJk", category: "FOOTWORK", description: "Agility ladder drills specifically designed for racket sport players." },
  { title: "Shadow Practice Guide", youtubeUrl: "https://www.youtube.com/watch?v=QdSLVfFdKhI", category: "FOOTWORK", description: "How to practice shadow footwork effectively to improve court coverage." },
  { title: "Strength Training for Racket Sports", youtubeUrl: "https://www.youtube.com/watch?v=kzG5bLHZIJg", category: "STRENGTH", description: "Gym exercises specifically tailored for racket sport players to build power." },
  { title: "Warm-Up Routine", youtubeUrl: "https://www.youtube.com/watch?v=iFBkCO1RTJQ", category: "FLEXIBILITY", description: "Complete dynamic warm-up routine before training or matches." },
  { title: "Smash Power Training", youtubeUrl: "https://www.youtube.com/watch?v=o82fFm2lGD8", category: "STRENGTH", description: "Build explosive smash power with these targeted exercises." },
  { title: "Flexibility Routine", youtubeUrl: "https://www.youtube.com/watch?v=3vxHGBEqNAs", category: "FLEXIBILITY", description: "Essential stretches for racket sport players to improve range of motion and prevent injury." },
  { title: "Solo Drills at Home", youtubeUrl: "https://www.youtube.com/watch?v=B1ie0loQKvQ", category: "HOME", description: "10 solo training drills you can do in any small space without a partner." },
];

interface WeekPlan {
  weekNumber: number;
  title: string;
  description: string;
  isRevealed: boolean;
  skillPointsReward: number;
  days: { dayOfWeek: number; exercises: { name: string; targetReps?: number; targetSets?: number; targetDurationMinutes?: number }[] }[];
}

const WEEKLY_CHALLENGES: WeekPlan[] = [
  {
    weekNumber: 1, title: "Foundation Week", description: "Build your base with simple exercises. Focus on form over speed.", isRevealed: true, skillPointsReward: 10,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Jump Rope / Skipping", targetDurationMinutes: 5 }, { name: "Plank Hold", targetDurationMinutes: 1, targetSets: 2 }] },
      { dayOfWeek: 2, exercises: [{ name: "Ready Position Practice", targetDurationMinutes: 5 }, { name: "Lateral Shuffles", targetDurationMinutes: 2, targetSets: 3 }, { name: "Fast Feet Taps", targetDurationMinutes: 1, targetSets: 3 }] },
      { dayOfWeek: 3, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Lunges", targetReps: 10, targetSets: 2 }, { name: "Calf Raises", targetReps: 15, targetSets: 2 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 200, targetSets: 1 }, { name: "Shuttle Juggling", targetDurationMinutes: 3 }, { name: "Grip Change Drill", targetReps: 30, targetSets: 1 }] },
      { dayOfWeek: 5, exercises: [{ name: "Hip Openers", targetDurationMinutes: 5 }, { name: "Hamstring Stretches", targetDurationMinutes: 3 }, { name: "Ankle Mobility", targetDurationMinutes: 3 }, { name: "Wrist Circles", targetDurationMinutes: 2 }] },
    ],
  },
  {
    weekNumber: 2, title: "Building Blocks", description: "Increase intensity slightly. Start combining movements.", isRevealed: false, skillPointsReward: 12,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "High Knees", targetDurationMinutes: 1, targetSets: 3 }, { name: "Star Jumps", targetReps: 15, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "Shadow Footwork", targetDurationMinutes: 8 }, { name: "Split Step Reaction Drill", targetReps: 15, targetSets: 2 }, { name: "Lunge Recovery Drill", targetReps: 10, targetSets: 2 }] },
      { dayOfWeek: 3, exercises: [{ name: "Push-ups", targetReps: 10, targetSets: 3 }, { name: "Squat Holds", targetDurationMinutes: 1, targetSets: 3 }, { name: "Dead Bug", targetReps: 10, targetSets: 2 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 300, targetSets: 1 }, { name: "Racket Swing Practice", targetReps: 20, targetSets: 3 }, { name: "Shuttle Juggling", targetDurationMinutes: 5 }] },
      { dayOfWeek: 5, exercises: [{ name: "Shoulder Mobility", targetDurationMinutes: 5 }, { name: "Single Leg Balance", targetDurationMinutes: 1, targetSets: 3 }, { name: "Hip Openers", targetDurationMinutes: 5 }] },
    ],
  },
  {
    weekNumber: 3, title: "Core Focus", description: "Strengthen your core for better stability on court.", isRevealed: false, skillPointsReward: 14,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Jump Rope / Skipping", targetDurationMinutes: 8 }, { name: "Plank Hold", targetDurationMinutes: 1, targetSets: 3 }, { name: "Bird Dog", targetReps: 10, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "6-Corner Shadow Drill", targetReps: 15, targetSets: 3 }, { name: "Lateral Shuffles", targetDurationMinutes: 2, targetSets: 3 }, { name: "Ready Position Practice", targetDurationMinutes: 5 }] },
      { dayOfWeek: 3, exercises: [{ name: "Side Plank", targetDurationMinutes: 1, targetSets: 2 }, { name: "Russian Twists", targetReps: 15, targetSets: 3 }, { name: "Bicycle Crunches", targetReps: 15, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 400, targetSets: 1 }, { name: "Serve Practice", targetReps: 30, targetSets: 2 }, { name: "Shuttle Juggling", targetDurationMinutes: 5 }] },
      { dayOfWeek: 5, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Hamstring Stretches", targetDurationMinutes: 5 }, { name: "Shoulder Mobility", targetDurationMinutes: 5 }] },
    ],
  },
  {
    weekNumber: 4, title: "Speed & Agility", description: "Develop quicker reactions and faster court coverage.", isRevealed: false, skillPointsReward: 16,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Shuttle Runs", targetReps: 8, targetSets: 3 }, { name: "Fast Feet Taps", targetDurationMinutes: 1, targetSets: 5 }] },
      { dayOfWeek: 2, exercises: [{ name: "Agility Ladder Drill", targetDurationMinutes: 5, targetSets: 3 }, { name: "Split Step Reaction Drill", targetReps: 20, targetSets: 3 }, { name: "Squat Jumps", targetReps: 10, targetSets: 3 }] },
      { dayOfWeek: 3, exercises: [{ name: "Mountain Climbers", targetReps: 15, targetSets: 3 }, { name: "Superman Hold", targetReps: 10, targetSets: 3 }, { name: "Plank Hold", targetDurationMinutes: 1, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 500, targetSets: 1 }, { name: "Racket Swing Practice", targetReps: 30, targetSets: 3 }, { name: "Serve Practice", targetReps: 40, targetSets: 2 }] },
      { dayOfWeek: 5, exercises: [{ name: "Hip Openers", targetDurationMinutes: 5 }, { name: "Ankle Mobility", targetDurationMinutes: 3 }, { name: "Single Leg Balance", targetDurationMinutes: 1, targetSets: 3 }, { name: "Wrist Circles", targetDurationMinutes: 2 }] },
    ],
  },
  {
    weekNumber: 5, title: "Power Builder", description: "Intermediate week. Build explosive power for smashes and jumps.", isRevealed: false, skillPointsReward: 18,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Jump Rope / Skipping", targetDurationMinutes: 10 }, { name: "Squat Jumps", targetReps: 12, targetSets: 3 }, { name: "Tuck Jumps", targetReps: 8, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "6-Corner Shadow Drill", targetReps: 20, targetSets: 3 }, { name: "Cross-Step Drill", targetReps: 10, targetSets: 3 }, { name: "Backward Movement Drill", targetReps: 10, targetSets: 3 }] },
      { dayOfWeek: 3, exercises: [{ name: "Push-ups", targetReps: 15, targetSets: 3 }, { name: "Tricep Dips", targetReps: 10, targetSets: 3 }, { name: "Russian Twists", targetReps: 20, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 600, targetSets: 1 }, { name: "Shuttle Juggling", targetDurationMinutes: 5 }, { name: "Racket Swing Practice", targetReps: 30, targetSets: 3 }] },
      { dayOfWeek: 5, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Shoulder Mobility", targetDurationMinutes: 5 }, { name: "Hamstring Stretches", targetDurationMinutes: 5 }] },
    ],
  },
  {
    weekNumber: 6, title: "Endurance Challenge", description: "Build stamina for longer rallies and matches.", isRevealed: false, skillPointsReward: 20,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Jump Rope / Skipping", targetDurationMinutes: 12 }, { name: "Mountain Climbers", targetReps: 20, targetSets: 3 }, { name: "Bear Crawls", targetDurationMinutes: 1, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "Shadow Footwork", targetDurationMinutes: 12 }, { name: "Lunge Recovery Drill", targetReps: 15, targetSets: 3 }, { name: "Fast Feet Taps", targetDurationMinutes: 1, targetSets: 5 }] },
      { dayOfWeek: 3, exercises: [{ name: "Plank Hold", targetDurationMinutes: 1, targetSets: 3 }, { name: "V-Sits", targetReps: 10, targetSets: 3 }, { name: "Bicycle Crunches", targetReps: 20, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 700, targetSets: 1 }, { name: "Serve Practice", targetReps: 50, targetSets: 2 }, { name: "Grip Change Drill", targetReps: 50, targetSets: 2 }] },
      { dayOfWeek: 5, exercises: [{ name: "Hip Openers", targetDurationMinutes: 5 }, { name: "Shoulder Mobility", targetDurationMinutes: 5 }, { name: "Ankle Mobility", targetDurationMinutes: 3 }] },
    ],
  },
  {
    weekNumber: 7, title: "Strength & Stability", description: "Focus on building muscle strength and joint stability.", isRevealed: false, skillPointsReward: 22,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "High Knees", targetDurationMinutes: 1, targetSets: 3 }, { name: "Wall Sits", targetDurationMinutes: 1, targetSets: 3 }, { name: "Calf Raises", targetReps: 20, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "6-Corner Shadow Drill", targetReps: 20, targetSets: 3 }, { name: "Agility Ladder Drill", targetDurationMinutes: 5, targetSets: 3 }, { name: "Split Step Reaction Drill", targetReps: 20, targetSets: 3 }] },
      { dayOfWeek: 3, exercises: [{ name: "Push-ups", targetReps: 15, targetSets: 3 }, { name: "Side Plank", targetDurationMinutes: 1, targetSets: 3 }, { name: "Dead Bug", targetReps: 12, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 800, targetSets: 1 }, { name: "Racket Swing Practice", targetReps: 30, targetSets: 3 }, { name: "Shuttle Juggling", targetDurationMinutes: 5 }] },
      { dayOfWeek: 5, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Hamstring Stretches", targetDurationMinutes: 5 }, { name: "Single Leg Balance", targetDurationMinutes: 1, targetSets: 3 }] },
    ],
  },
  {
    weekNumber: 8, title: "Combination Week", description: "Combine different exercise types for well-rounded fitness.", isRevealed: false, skillPointsReward: 24,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Burpees", targetReps: 8, targetSets: 3 }, { name: "Jump Rope / Skipping", targetDurationMinutes: 8 }, { name: "Squat Jumps", targetReps: 12, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "Cross-Step Drill", targetReps: 12, targetSets: 3 }, { name: "Backward Movement Drill", targetReps: 12, targetSets: 3 }, { name: "Shadow Footwork", targetDurationMinutes: 10 }] },
      { dayOfWeek: 3, exercises: [{ name: "Russian Twists", targetReps: 20, targetSets: 3 }, { name: "Superman Hold", targetReps: 12, targetSets: 3 }, { name: "Bird Dog", targetReps: 12, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 800, targetSets: 1 }, { name: "Serve Practice", targetReps: 50, targetSets: 2 }, { name: "Racket Swing Practice", targetReps: 30, targetSets: 3 }] },
      { dayOfWeek: 5, exercises: [{ name: "Hip Openers", targetDurationMinutes: 5 }, { name: "Shoulder Mobility", targetDurationMinutes: 5 }, { name: "Wrist Circles", targetDurationMinutes: 3 }, { name: "Ankle Mobility", targetDurationMinutes: 3 }] },
    ],
  },
  {
    weekNumber: 9, title: "Advanced Cardio", description: "Push your cardiovascular limits with intense interval training.", isRevealed: false, skillPointsReward: 26,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Sprint Intervals", targetDurationMinutes: 10 }, { name: "Burpees", targetReps: 10, targetSets: 3 }, { name: "Tuck Jumps", targetReps: 10, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "6-Corner Shadow Drill", targetReps: 25, targetSets: 3 }, { name: "Shuttle Runs", targetReps: 10, targetSets: 3 }, { name: "Agility Ladder Drill", targetDurationMinutes: 5, targetSets: 3 }] },
      { dayOfWeek: 3, exercises: [{ name: "V-Sits", targetReps: 12, targetSets: 3 }, { name: "Plank Hold", targetDurationMinutes: 1, targetSets: 3 }, { name: "Mountain Climbers", targetReps: 20, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 900, targetSets: 1 }, { name: "Serve Practice", targetReps: 50, targetSets: 2 }, { name: "Shuttle Juggling", targetDurationMinutes: 5 }] },
      { dayOfWeek: 5, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Hamstring Stretches", targetDurationMinutes: 5 }, { name: "Hip Openers", targetDurationMinutes: 5 }] },
    ],
  },
  {
    weekNumber: 10, title: "Gym Power Week", description: "For those with gym access - build serious power. Home alternatives available.", isRevealed: false, skillPointsReward: 28,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Box Jumps", targetReps: 10, targetSets: 3 }, { name: "Medicine Ball Throws", targetReps: 10, targetSets: 3 }, { name: "Resistance Band Pulls", targetReps: 15, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "Shadow Footwork", targetDurationMinutes: 15 }, { name: "Cross-Step Drill", targetReps: 15, targetSets: 3 }, { name: "Split Step Reaction Drill", targetReps: 25, targetSets: 3 }] },
      { dayOfWeek: 3, exercises: [{ name: "Dumbbell Shoulder Press", targetReps: 12, targetSets: 3 }, { name: "Cable Rotations", targetReps: 12, targetSets: 3 }, { name: "Bench Press", targetReps: 10, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 1000, targetSets: 1 }, { name: "Racket Swing Practice", targetReps: 30, targetSets: 3 }, { name: "Serve Practice", targetReps: 50, targetSets: 2 }] },
      { dayOfWeek: 5, exercises: [{ name: "Shoulder Mobility", targetDurationMinutes: 5 }, { name: "Hip Openers", targetDurationMinutes: 5 }, { name: "Single Leg Balance", targetDurationMinutes: 1, targetSets: 3 }] },
    ],
  },
  {
    weekNumber: 11, title: "Elite Training", description: "High intensity week for serious improvement.", isRevealed: false, skillPointsReward: 30,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Sprint Intervals", targetDurationMinutes: 12 }, { name: "Burpees", targetReps: 12, targetSets: 3 }, { name: "Bear Crawls", targetDurationMinutes: 1, targetSets: 3 }] },
      { dayOfWeek: 2, exercises: [{ name: "6-Corner Shadow Drill", targetReps: 30, targetSets: 3 }, { name: "Backward Movement Drill", targetReps: 15, targetSets: 3 }, { name: "Lunge Recovery Drill", targetReps: 15, targetSets: 3 }] },
      { dayOfWeek: 3, exercises: [{ name: "Push-ups", targetReps: 20, targetSets: 3 }, { name: "Tricep Dips", targetReps: 15, targetSets: 3 }, { name: "V-Sits", targetReps: 12, targetSets: 3 }, { name: "Side Plank", targetDurationMinutes: 1, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 1000, targetSets: 1 }, { name: "Serve Practice", targetReps: 50, targetSets: 2 }, { name: "Shuttle Juggling", targetDurationMinutes: 8 }] },
      { dayOfWeek: 5, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Hamstring Stretches", targetDurationMinutes: 5 }, { name: "Shoulder Mobility", targetDurationMinutes: 5 }, { name: "Ankle Mobility", targetDurationMinutes: 3 }] },
    ],
  },
  {
    weekNumber: 12, title: "Champion's Challenge", description: "Final week! Complete this to prove you're competition ready.", isRevealed: false, skillPointsReward: 35,
    days: [
      { dayOfWeek: 1, exercises: [{ name: "Burpees", targetReps: 15, targetSets: 3 }, { name: "Tuck Jumps", targetReps: 12, targetSets: 3 }, { name: "Sprint Intervals", targetDurationMinutes: 12 }, { name: "Jump Rope / Skipping", targetDurationMinutes: 10 }] },
      { dayOfWeek: 2, exercises: [{ name: "6-Corner Shadow Drill", targetReps: 30, targetSets: 3 }, { name: "Cross-Step Drill", targetReps: 15, targetSets: 3 }, { name: "Agility Ladder Drill", targetDurationMinutes: 5, targetSets: 3 }, { name: "Fast Feet Taps", targetDurationMinutes: 1, targetSets: 5 }] },
      { dayOfWeek: 3, exercises: [{ name: "Plank Hold", targetDurationMinutes: 2, targetSets: 3 }, { name: "Russian Twists", targetReps: 25, targetSets: 3 }, { name: "V-Sits", targetReps: 15, targetSets: 3 }, { name: "Push-ups", targetReps: 20, targetSets: 3 }] },
      { dayOfWeek: 4, exercises: [{ name: "Wall Rallies", targetReps: 1000, targetSets: 1 }, { name: "Serve Practice", targetReps: 50, targetSets: 2 }, { name: "Racket Swing Practice", targetReps: 40, targetSets: 3 }, { name: "Grip Change Drill", targetReps: 50, targetSets: 2 }] },
      { dayOfWeek: 5, exercises: [{ name: "Dynamic Stretches", targetDurationMinutes: 5 }, { name: "Hip Openers", targetDurationMinutes: 5 }, { name: "Shoulder Mobility", targetDurationMinutes: 5 }, { name: "Single Leg Balance", targetDurationMinutes: 2, targetSets: 3 }] },
    ],
  },
];

export async function seedExercises() {
  const existing = await db.select().from(juniorExercises).limit(1);
  if (existing.length > 0) {
    const existingChallenges = await db.select().from(juniorWeeklyChallenges).limit(1);
    if (existingChallenges.length > 0) {
      console.log("[EXERCISE SEED] Exercises already seeded, skipping.");
      return;
    }
    console.log("[EXERCISE SEED] Exercises exist but challenges missing, seeding challenges...");
    const allExercises = await db.select().from(juniorExercises);
    const exerciseMap = new Map<string, number>();
    allExercises.forEach(e => exerciseMap.set(e.name, e.id));
    await seedChallenges(exerciseMap);
    return;
  }

  console.log("[EXERCISE SEED] Seeding exercise library...");

  const exerciseMap = new Map<string, number>();

  for (let i = 0; i < EXERCISES.length; i++) {
    const ex = EXERCISES[i];
    const [inserted] = await db.insert(juniorExercises).values({
      name: ex.name,
      description: ex.description,
      category: ex.category,
      difficulty: ex.difficulty,
      durationMinutes: ex.durationMinutes || null,
      reps: ex.reps || null,
      sets: ex.sets || null,
      equipment: ex.equipment || null,
      videoUrl: ex.videoUrl || null,
      location: ex.location,
      displayOrder: i,
    }).returning();
    exerciseMap.set(ex.name, inserted.id);
  }

  console.log(`[EXERCISE SEED] Seeded ${exerciseMap.size} exercises.`);

  await seedChallenges(exerciseMap);
}

async function seedChallenges(exerciseMap: Map<string, number>) {
  for (const week of WEEKLY_CHALLENGES) {
    const [challenge] = await db.insert(juniorWeeklyChallenges).values({
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      isRevealed: week.isRevealed,
      skillPointsReward: week.skillPointsReward,
    }).returning();

    for (const day of week.days) {
      for (let i = 0; i < day.exercises.length; i++) {
        const ex = day.exercises[i];
        const exerciseId = exerciseMap.get(ex.name);
        if (!exerciseId) {
          console.warn(`[EXERCISE SEED] Exercise not found: ${ex.name}`);
          continue;
        }
        await db.insert(juniorChallengeDays).values({
          challengeId: challenge.id,
          dayOfWeek: day.dayOfWeek,
          exerciseId,
          displayOrder: i,
          targetReps: ex.targetReps || null,
          targetSets: ex.targetSets || null,
          targetDurationMinutes: ex.targetDurationMinutes || null,
        });
      }
    }
  }

  console.log(`[EXERCISE SEED] Seeded ${WEEKLY_CHALLENGES.length} weekly challenges.`);

  const existingVideos = await db.select().from(juniorExerciseVideos).limit(1);
  if (existingVideos.length === 0) {
    for (const video of EXERCISE_VIDEOS) {
      await db.insert(juniorExerciseVideos).values({
        title: video.title,
        youtubeUrl: video.youtubeUrl,
        category: video.category,
        description: video.description,
      });
    }
    console.log(`[EXERCISE SEED] Seeded ${EXERCISE_VIDEOS.length} exercise videos.`);
  }
}
