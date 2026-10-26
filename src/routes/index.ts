import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { categoriesRouter } from "../modules/categories/categories.routes.js";
import { productsRouter } from "../modules/products/products.routes.js";

// Aggregates all module routers under /api/v1
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/products", productsRouter);

// ------------- Nine steps for video streaming ----------------------
// STEP-1: Camera Setup:
        // - camera LAN pa challta ha, aor router pa uski fix IP setup krtay han otherwise restart pa IP change ho jata ha.
        // - Camera ka web panel main RTSP enable krtay han, default password change krtay han.
        // - Stream set krna: main stream H.264, 1080p(recording), substream 640*360, 10-15 FPS (AI & GRID VIEW)

// STEP-2: VERIFY RTSP URL:
        // - Company path documentation ya ONVIF discovery say milta ha
        // - ffprobe command, asli url pa chala kr codec/resolution confirm krtay han.

// STEP-3: MediaMTX in pull mode:
        // - Now there is no need of ffmpeg, MediaMTX ko config mein btatay han "ya path is camera sa khenchoo" then vo kud RTSP client ban jata ha.
        // - Advantage: camera sa srf ek connection banta ha.

// STEP-4: Camera management in app:
        // - first backend feature in our module.

// STEP-5: Security:
        // - Don't expose RTSP port (8554) over internet. just in internal network.
        // - ...

// STEP-6: Live View:
        // - run the video stream through HLS.

// STEP-7: Recording:
        // - MediaMTX kud b recording kr sakta ha (segment, old file auto deleted), ya ffmpeg sa krva saktay han. DO in phase 2.

// STEP-8: AI Service:
        // - Python service camera sa nahi MediaMTX sa sub stream padhti ha, takay camera pa load na parhay.

// STEP-9: Health Monitoring:
        //  - Camera band ho jay tu ya network drop ho tu MediamTX event send krta ha  → backend camera ka status offline karta hai → dashboard pe red dot aur alert

// ------------------------------------- Development phase -----------------------
    // Phase 0: Lab setup ✓
        //  RTSP concept, tools, MediaMTX
        //  TCP fix, browser mein HLS
        //  Real video loop, VLC + browser mein chal rahi hai
        
    // Phase 1: Video fundamentals + live view