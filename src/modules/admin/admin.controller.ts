import type { Request, Response } from "express";

export async function adminPingController(req: Request, res: Response) {
  res.status(200).json({
    success: true,
    data: { message: "Admin access granted", userId: req.user?.id },
  });
}
