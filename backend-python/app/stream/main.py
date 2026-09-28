import asyncio
import logging
import sys

from app.stream.upbit_ws import UpbitStreamer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

if __name__ == "__main__":
    logging.getLogger(__name__).info("Upbit 실시간 시세 스트리머 시작")
    try:
        asyncio.run(UpbitStreamer().run_forever())
    except KeyboardInterrupt:
        pass
