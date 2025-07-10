function getCommonConfig() {
  return {
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
  };
}

export default getCommonConfig;
