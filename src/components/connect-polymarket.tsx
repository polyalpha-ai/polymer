"use client"

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Image from 'next/image'

export function ConnectPolymarket() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isInitializing, setIsInitializing] = useState(false)

  // Auto-switch to Polygon if connected to wrong network
  useEffect(() => {
    if (isConnected && chainId !== polygon.id) {
      switchChain({ chainId: polygon.id })
    }
  }, [isConnected, chainId, switchChain])

  const handleConnect = async () => {
    setIsInitializing(true)
    try {
      // Connect MetaMask - try different connector IDs
      let metaMaskConnector = connectors.find(c => c.id === 'io.metamask') 
        || connectors.find(c => c.id === 'metaMask')
        || connectors.find(c => c.name?.toLowerCase().includes('metamask'))
        || connectors[0] // fallback to first available connector
      
      if (!metaMaskConnector) {
        alert('No wallet connector found. Please install MetaMask or another compatible wallet.')
        return
      }
      
      console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })))
      console.log('Using connector:', { id: metaMaskConnector.id, name: metaMaskConnector.name })
      
      await connect({ connector: metaMaskConnector })
      
    } catch (error) {
      console.error('Connection failed:', error)
      alert(`Failed to connect wallet: ${error.message || 'Unknown error'}`)
    } finally {
      setIsInitializing(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {!isConnected ? (
            <Button
              variant="ghost"
              size="default"
              className="p-2 hover:bg-white/10 drop-shadow-md rounded-lg"
              onClick={handleConnect}
              disabled={isInitializing || isPending}
            >
              <Image
                src="/polymarket.png"
                alt="Connect Polymarket"
                width={64}
                height={64}
                className="rounded"
              />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="default"
              className="p-2 hover:bg-white/10 drop-shadow-md rounded-lg relative"
              onClick={handleDisconnect}
            >
              <Image
                src="/polymarket.png"
                alt="Connected to Polymarket"
                width={64}
                height={64}
                className="rounded opacity-90"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white/20 shadow-sm"></div>
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {!isConnected 
              ? (isInitializing || isPending ? 'Connecting...' : 'Connect MetaMask for Polymarket trading') 
              : `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}