import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AnalysisType,
  type TechnicalAnalysisRequestParams,
  type MarketTrendAnalysisRequestParams,
  type AnalysisResultData,
  type AnalysisProcessingResponse,
  type AnalysisResultResponse,
} from "@/types/analysis.types";
import { analysisAPI } from "@/api/analysis.api";
// import { Loader2 } from "lucide-react"; // [진단] 아이콘 임포트 제거

// 폴링 간격 (예: 3초)
const POLLING_INTERVAL = 3000;

// Java 응답이 "PROCESSING"인지 확인하는 타입 가드
function isProcessingResponse(
  response: AnalysisResultResponse
): response is AnalysisProcessingResponse {
  return (response as AnalysisProcessingResponse).status === "PROCESSING";
}

// Java 응답이 Python의 "AnalysisResultData"인지 확인하는 타입 가드
function isResultData(
  response: AnalysisResultResponse
): response is AnalysisResultData {
  return (response as AnalysisResultData).status === "SUCCESS" || (response as AnalysisResultData).status === "FAILED";
}

export const Analysis = () => {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "IDLE" | "PROCESSING" | "SUCCESS" | "FAILED"
  >("IDLE");
  const [resultData, setResultData] = useState<AnalysisResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  // --- 3. 폴링(Polling) 로직 ---
  useEffect(() => {
    if (status !== "PROCESSING" || !requestId) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const response = await analysisAPI.fetchResult(requestId);

        if (isResultData(response)) {
          // Python 결과 (SUCCESS 또는 FAILED)
          clearInterval(intervalId);
          if (response.status === "SUCCESS") {
            setStatus("SUCCESS");
            setResultData(response);
            setError(null);
          } else {
            // Python 내부 오류
            setStatus("FAILED");
            setError(response.error_message || "분석 중 오류가 발생했습니다.");
            setResultData(null);
          }
        } else if (isProcessingResponse(response)) {
          // Java의 "PROCESSING" 상태
          setStatus("PROCESSING");
          setLoadingMessage(response.message); // "분석이 진행 중입니다."
        }
        
      } catch (err) {
        // API 호출 자체 실패 (404, 500 등)
        clearInterval(intervalId);
        setStatus("FAILED");
        setError("결과를 가져오는 데 실패했습니다.");
        console.error("Polling error:", err);
      }
    }, POLLING_INTERVAL);

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      clearInterval(intervalId);
    };
  }, [status, requestId]);

  // --- 1. 분석 요청 핸들러 ---
  const handleRequestAnalysis = async (type: AnalysisType) => {
    // 상태 초기화
    setStatus("PROCESSING");
    setRequestId(null);
    setResultData(null);
    setError(null);
    setLoadingMessage("분석 요청 중...");

    try {
      let response;
      if (type === AnalysisType.TECHNICAL) {
        const params: TechnicalAnalysisRequestParams = {
          symbol: "AAPL", // TODO: 실제 UI에서 입력받기
          timeframe: "1d",
          market: "STOCK",
        };
        response = await analysisAPI.requestTechnical(params);
      } else {
        const params: MarketTrendAnalysisRequestParams = {
          market: "STOCK", // TODO: 실제 UI에서 입력받기
        };
        response = await analysisAPI.requestMarketTrend(params);
      }
      
      setRequestId(response.requestId);
      setLoadingMessage(response.message); // "분석 요청이 접수되었습니다."

    } catch (err) {
      setStatus("FAILED");
      setError("분석 요청에 실패했습니다.");
      console.error("Request analysis error:", err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">AI 분석 서비스 (진단 모드)</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>분석 요청</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={() => handleRequestAnalysis(AnalysisType.TECHNICAL)}
            disabled={status === "PROCESSING"}
          >
            {/* [진단] 아이콘 제거 */}
            {status === "PROCESSING" && "..."}
            기술적 분석 (AAPL)
          </Button>
          <Button
            onClick={() => handleRequestAnalysis(AnalysisType.MARKET_TREND)}
            disabled={status === "PROCESSING"}
            variant="secondary"
          >
            {/* [진단] 아이콘 제거 */}
            {status === "PROCESSING" && "..."}
            시장 트렌드 분석 (STOCK)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>분석 결과</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "IDLE" && <p>분석을 요청하세요.</p>}
          
          {status === "PROCESSING" && (
            <div className="flex items-center gap-2">
              {/* [진단] 아이콘을 텍스트로 변경 */}
              <p className="text-lg font-semibold animate-pulse">(분석 중...)</p>
              <p className="text-lg">{loadingMessage} (ID: {requestId})</p>
            </div>
          )}

          {status === "FAILED" && (
            <p className="text-red-500">오류: {error}</p>
          )}

          {status === "SUCCESS" && resultData && (
            <div>
              <h3 className="text-xl font-semibold mb-2">
                [{resultData.analysis_type}] 분석 완료 - 추천: 
                <span className={
                  resultData.recommendation === "BUY" ? "text-green-600 ml-2" :
                  resultData.recommendation === "SELL" ? "text-red-600 ml-2" :
                  "text-gray-600 ml-2"
                }>
                  {resultData.recommendation}
                </span>
              </h3>
              <p className="mb-4 whitespace-pre-wrap bg-gray-100 p-4 rounded-md dark:bg-gray-800 dark:text-gray-200">
                <strong>요약:</strong> {resultData.summary}
              </p>
              
              <h4 className="font-semibold">Raw 데이터 (JSON)</h4>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm">
                {JSON.stringify(resultData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
