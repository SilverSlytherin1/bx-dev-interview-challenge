function getCommonConfig() {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
  };
}

export default getCommonConfig;
