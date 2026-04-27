-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "age" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "gender" TEXT,
    "goal" TEXT,
    "activityLevel" TEXT,
    "dailyCalorieGoal" INTEGER NOT NULL DEFAULT 2000,
    "dailyWaterGoalMl" INTEGER NOT NULL DEFAULT 2500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "servingSize" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "servingUnit" TEXT NOT NULL DEFAULT 'g',
    "caloriesPer" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbsG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fibreG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugarG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodiumMg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalCalories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProteinG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCarbsG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWaterMl" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealEntry" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "foodItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbsG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterEntry" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "amountMl" DOUBLE PRECISION NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealEntry" ADD CONSTRAINT "MealEntry_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterEntry" ADD CONSTRAINT "WaterEntry_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
