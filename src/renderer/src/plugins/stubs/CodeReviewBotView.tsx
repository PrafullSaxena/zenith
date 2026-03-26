export default function CodeReviewBotView(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">CodeReviewBot</h2>
        <p className="mt-2 text-sm text-muted-foreground">Automated PR code review</p>
      </div>
    </div>
  )
}
