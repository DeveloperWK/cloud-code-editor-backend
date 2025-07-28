const containerTemplates = (
  language: string,
  docker_image: string,
  sliceprojectId: string,
  containerPath: string,
  hostPath: string,
) => {
  switch (language) {
    case "node":
      return {
        Image: docker_image,
        name: `playground-${sliceprojectId}`,
        Tty: true,
        OpenStdin: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: containerPath,
        HostConfig: {
          Binds: [`${hostPath}:${containerPath}`],
          Memory: 512 * 1024 * 1024, // 512 MB
          CpuPeriod: 100000,
          CpuQuota: 25000, // 25% CPU
        },
        Cmd: ["tail", "-f", "/dev/null"], // Keep container running
      };
      break;
    case "python":
      return {
        Image: docker_image,
        name: `playground-${sliceprojectId}`,
        Tty: true,
        OpenStdin: true,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: containerPath,
        HostConfig: {
          Binds: [`${hostPath}:${containerPath}`],
          Memory: 512 * 1024 * 1024, // 512 MB
          CpuPeriod: 100000,
          CpuQuota: 25000, // 25% CPU
        },
        Cmd: ["tail", "-f", "/dev/null"], // Keep container running
      };
      break;
    default:
      return null;
  }
};
