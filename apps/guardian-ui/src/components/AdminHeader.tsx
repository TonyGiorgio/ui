import React, { FC, useEffect, useState } from 'react';
import { CopyInput } from '@fedimint/ui';
import { useAppContext, useSetupContext } from '../hooks';
import { Flex, Box, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { ReactComponent as CopyIcon } from '../assets/svgs/copy.svg';

interface PillProp {
  text: string;
  status: string;
  backgroundColor?: string;
  statusColor?: string;
}

// Have to update pull color based on quorum.
export const Pill: FC<PillProp> = ({
  text,
  status,
  backgroundColor,
  statusColor,
}) => {
  return (
    <Flex gap='8px' alignItems='center'>
      <Text color='#6B7280' lineHeight='27px' fontSize='14px'>
        {text}
      </Text>
      <Flex
        gap='6px'
        p='2px 10px'
        borderRadius='32px'
        alignItems='center'
        bgColor={backgroundColor ?? '#D1FAE5'}
      >
        <Box bgColor='#34D399' h='8px' w='8px' borderRadius='32px'></Box>
        <Text
          color={statusColor ?? '#065F46'}
          fontSize='12px'
          lineHeight='16px'
          fontWeight='500'
        >
          {status}
        </Text>
      </Flex>
    </Flex>
  );
};

interface AdminHeaderProps {
  connectionCode: string;
}

export function AdminHeader({ connectionCode }: AdminHeaderProps) {
  const [guardiansText, setGuardiansText] = useState<string | undefined>();
  const [percentOnline, setPercentOnline] = useState<number | undefined>();
  const [guardiansBackgroundColor, setGuardiansBackgroundColor] = useState<
    string | undefined
  >();
  const [guardiansStatusColor, setGuardiansStatusColor] = useState<
    string | undefined
  >();

  const {
    state: { configGenParams },
  } = useSetupContext();
  const { api } = useAppContext();

  // will have to do polling
  useEffect(() => {
    async function getStatus() {
      const { consensus } = await api.status();
      const online = consensus ? consensus.peers_online + 1 : 1;
      const offline = consensus ? consensus.peers_offline : 1;
      const totalPeers = online + offline;
      const percentOnline = online / totalPeers;
      setPercentOnline(percentOnline);
      setGuardiansText(`${online} / ${totalPeers}`);
    }
    getStatus();
  }, [api]);

  const greenBG = useColorModeValue('green.400', 'green.900');
  const greenStatus = useColorModeValue('green.900', 'green.400');

  const yellowBG = useColorModeValue('yellow.400', 'yellow.900');
  const yellowStatus = useColorModeValue('yellow.900', 'yellow.400');

  const redBG = useColorModeValue('red.400', 'red.900');
  const redStatus = useColorModeValue('red.900', 'red.400');
  useEffect(() => {
    if (!percentOnline) {
      return;
    }
    if (percentOnline == 1) {
      setGuardiansBackgroundColor(greenBG);
      setGuardiansStatusColor(greenStatus);
    } else if (percentOnline >= 2 / 3) {
      setGuardiansBackgroundColor(yellowBG);
      setGuardiansStatusColor(yellowStatus);
    } else {
      setGuardiansBackgroundColor(redBG);
      setGuardiansStatusColor(redStatus);
    }
  }, [
    greenBG,
    greenStatus,
    percentOnline,
    redBG,
    redStatus,
    yellowBG,
    yellowStatus,
  ]);

  return (
    <Flex>
      <Box>
        <Text
          color='#111827'
          fontSize='24px'
          fontWeight='600'
          lineHeight='32px'
          textTransform='capitalize'
        >
          {configGenParams?.meta?.federation_name}
        </Text>
        <Text color='#111827' fontSize='14px' lineHeight='32px'>
          A community-based coalition focused on ushering the world into a
          bitcoin standard
        </Text>
        <Flex gap='12px' mt='13px'>
          <Pill
            text='Guardians'
            status={`${guardiansText}`}
            statusColor={guardiansStatusColor}
            backgroundColor={guardiansBackgroundColor}
          />
          <Pill text='Server' status='Healthy' />
          <Pill text='Uptime' status='100%' />
        </Flex>
        <Box mt='38px'>
          <Text mb='6px' fontSize='14px' fontWeight='500' color='#344054'>
            Invite Members
          </Text>
          <CopyInput
            value={connectionCode}
            buttonLeftIcon={<Icon as={CopyIcon} />}
          />
          <Text mt='6px' mb='25px' fontSize='14px' color='#6B7280'>
            Share this to invite members to join the federation{' '}
          </Text>
        </Box>
      </Box>
    </Flex>
  );
}
