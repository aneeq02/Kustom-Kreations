import { Router, Request, Response } from 'express';

const router = Router();

// Stripe webhook will be wired up here when payment is integrated.
router.post('/stripe', (_req: Request, res: Response) => {
  res.json({ received: true });
});

export default router;
