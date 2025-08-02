import path from "node:path";
import runWorker from "./workers/createWorkers";

const tryCreateContainer = async (
  projectId: string,
  image: string,
  containerPath: string,
  hostPath: string,
) => {
  try {
    const result = await runWorker(
      path.join(
        __dirname,
        "workers",
        `createContainerWorker${process.env.NODE_ENV === "production" ? ".js" : ".ts"}`,
      ),
      {
        projectId,
        image,
        containerPath,
        hostPath,
      },
    );
    return result;
  } catch (error) {
    console.error("Error in container worker:", (error as Error).message);
    throw error;
  }
};
export default tryCreateContainer;
