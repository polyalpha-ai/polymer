'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/use-auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

export default function AnalysisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    fetchAnalysis()
  }, [user, params.id, router])

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/user/history/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to fetch analysis:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading analysis...</p>
      </div>
    )
  }

  if (!analysis) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Analysis Details</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={() => router.push('/')}>
              New Analysis
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{analysis.report?.market_question || 'Polymarket Analysis'}</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2 mt-2">
                <span>{analysis.market_url}</span>
                <div className="flex gap-4 text-sm">
                  <span>Started: {format(new Date(analysis.started_at), 'PPpp')}</span>
                  <span>Completed: {format(new Date(analysis.completed_at), 'PPpp')}</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.report && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysis.report.probability !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Probability</p>
                      <p className="text-2xl font-bold">
                        {(analysis.report.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {analysis.report.confidence && (
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <Badge variant="secondary" className="mt-1">
                        {analysis.report.confidence}
                      </Badge>
                    </div>
                  )}
                  {analysis.valyu_cost && (
                    <div>
                      <p className="text-sm text-muted-foreground">API Cost</p>
                      <p className="text-lg font-semibold">
                        ${analysis.valyu_cost.toFixed(4)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default" className="mt-1">
                      {analysis.status}
                    </Badge>
                  </div>
                </div>

                {analysis.report.summary && (
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {analysis.report.summary}
                    </p>
                  </div>
                )}

                {analysis.report.reasoning && (
                  <div>
                    <h3 className="font-semibold mb-2">Reasoning</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {analysis.report.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {analysis.analysis_steps && analysis.analysis_steps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Steps</CardTitle>
              <CardDescription>
                Detailed breakdown of the analysis process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.analysis_steps.map((step: any, index: number) => (
                <Collapsible
                  key={index}
                  open={expandedSteps.has(index)}
                  onOpenChange={() => toggleStep(index)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{step.step}</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedSteps.has(index) ? 'rotate-180' : ''
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(step.timestamp), 'PPpp')}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}