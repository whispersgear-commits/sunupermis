import React from "react";
import { Composition } from "remotion";
import { Short } from "./Short";
import timeline from "./timeline.json";

export const Root: React.FC = () => (
  <Composition id="Short" component={Short} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={1080} height={1920} />
);
