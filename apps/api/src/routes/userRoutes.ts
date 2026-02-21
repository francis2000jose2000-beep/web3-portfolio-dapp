import { Router } from "express";
import { getUserByWallet, upsertUserByWallet } from "../controllers/userController";

export const userRouter: Router = Router();

userRouter.get("/:walletAddress", getUserByWallet);
userRouter.put("/:walletAddress", upsertUserByWallet);

